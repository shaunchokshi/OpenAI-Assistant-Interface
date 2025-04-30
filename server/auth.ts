import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType, LoginUser, InsertUser, resetPasswordSchema, requestPasswordResetSchema } from "@shared/schema";
import { sendTempPassword, sendPasswordResetLink } from "./email";

declare global {
  namespace Express {
    // Use UserType to avoid recursive type definition
    interface User extends UserType {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: { 
      secure: isProduction, // Only use HTTPS in production
      httpOnly: true, // Prevent client-side JS from reading the cookie
      sameSite: isProduction ? 'strict' : 'lax', // CSRF protection in production
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !user.password || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          } else {
            return done(null, user);
          }
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // GitHub OAuth Strategy
  if (process.env.GITHUB_ID && process.env.GITHUB_SECRET && process.env.GITHUB_CALLBACK) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_ID,
          clientSecret: process.env.GITHUB_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK,
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email found in GitHub profile"), false);
            }

            // Check if we have an OAuth profile already
            const existingProfile = await storage.getOAuthProfileByProviderAndId(
              "github", 
              profile.id.toString()
            );
            
            if (existingProfile) {
              // User exists, get the user and update tokens
              const user = await storage.getUser(existingProfile.userId);
              if (!user) {
                return done(new Error("User not found for existing OAuth profile"), false);
              }
              
              // Update tokens if needed
              await storage.findOrCreateOAuthProfile(
                "github",
                profile.id.toString(),
                user.id,
                accessToken,
                refreshToken
              );
              
              return done(null, user);
            }
            
            // Check if a user with this email already exists
            let user = await storage.getUserByEmail(email);
            
            if (!user) {
              // Create new user
              user = await storage.createUserWithOAuth(
                email, 
                profile.displayName || profile.username,
                profile.photos?.[0]?.value
              );
            }
            
            // Create OAuth profile
            await storage.findOrCreateOAuthProfile(
              "github",
              profile.id.toString(),
              user.id,
              accessToken,
              refreshToken
            );
            
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  // Google OAuth Strategy
  if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET && process.env.GOOGLE_CALLBACK) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_ID,
          clientSecret: process.env.GOOGLE_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK,
          scope: ["email", "profile"],
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email found in Google profile"), false);
            }

            // Check if we have an OAuth profile already
            const existingProfile = await storage.getOAuthProfileByProviderAndId(
              "google", 
              profile.id
            );
            
            if (existingProfile) {
              // User exists, get the user and update tokens
              const user = await storage.getUser(existingProfile.userId);
              if (!user) {
                return done(new Error("User not found for existing OAuth profile"), false);
              }
              
              // Update tokens if needed
              await storage.findOrCreateOAuthProfile(
                "google",
                profile.id,
                user.id,
                accessToken,
                refreshToken
              );
              
              return done(null, user);
            }
            
            // Check if a user with this email already exists
            let user = await storage.getUserByEmail(email);
            
            if (!user) {
              // Create new user with profile data
              user = await storage.createUserWithOAuth(
                email, 
                profile.displayName,
                profile.photos?.[0]?.value
              );
            }
            
            // Create OAuth profile
            await storage.findOrCreateOAuthProfile(
              "google",
              profile.id,
              user.id,
              accessToken,
              refreshToken
            );
            
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const userData: InsertUser = req.body;
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Check if password is provided
      if (!userData.password) {
        return res.status(400).json({ message: "Password is required" });
      }

      // Hash the password before storing
      const hashedPassword = await hashPassword(userData.password);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ id: user.id, email: user.email });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error during registration" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    try {
      if (req.user && req.sessionID) {
        // Track the user session
        await storage.createUserSession(
          req.user.id,
          req.sessionID,
          req.headers['user-agent'],
          req.ip
        );
      }
      
      res.status(200).json({ id: req.user?.id, email: req.user?.email });
    } catch (error) {
      console.error("Error tracking login session:", error);
      // Still return success even if session tracking failed
      res.status(200).json({ id: req.user?.id, email: req.user?.email });
    }
  });

  app.post("/api/logout", async (req, res, next) => {
    try {
      if (req.user && req.sessionID) {
        // Find the session ID by session ID
        const userId = req.user.id;
        
        // Get all sessions for the user
        const sessions = await storage.getUserSessions(userId);
        const currentSession = sessions.find(session => session.sessionId === req.sessionID);
        
        // Terminate the current session if found
        if (currentSession) {
          await storage.terminateUserSession(currentSession.id);
        }
      }

      req.logout((err) => {
        if (err) return next(err);
        res.sendStatus(200);
      });
    } catch (error) {
      console.error("Error ending session:", error);
      req.logout((err) => {
        if (err) return next(err);
        res.sendStatus(200);
      });
    }
  });
  
  // User sessions API
  app.get("/api/user/sessions", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const sessions = await storage.getUserSessions(userId);
      
      // Don't send sensitive data back to client
      const sanitizedSessions = sessions.map(session => ({
        id: session.id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        lastActive: session.lastActive,
        createdAt: session.createdAt,
        isCurrent: session.sessionId === req.sessionID
      }));
      
      res.json(sanitizedSessions);
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      res.status(500).json({ message: "Failed to fetch user sessions" });
    }
  });
  
  app.delete("/api/user/sessions/:id", ensureAuthenticated, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id, 10);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      await storage.terminateUserSession(sessionId);
      res.status(200).json({ message: "Session terminated successfully" });
    } catch (error) {
      console.error("Error terminating session:", error);
      res.status(500).json({ message: "Failed to terminate session" });
    }
  });
  
  app.delete("/api/user/sessions", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Keep the current session active, terminate all others
      await storage.terminateAllUserSessions(userId, req.sessionID);
      
      res.status(200).json({ message: "All other sessions terminated successfully" });
    } catch (error) {
      console.error("Error terminating sessions:", error);
      res.status(500).json({ message: "Failed to terminate sessions" });
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json({ id: req.user?.id, email: req.user?.email });
  });

  // OAuth routes
  app.get("/auth/github", passport.authenticate("github"));
  app.get(
    "/auth/github/callback",
    passport.authenticate("github", { failureRedirect: "/auth" }),
    async (req, res) => {
      try {
        // Track the user session on successful login
        if (req.user && req.sessionID) {
          await storage.createUserSession(
            req.user.id,
            req.sessionID,
            req.headers['user-agent'],
            req.ip
          );
        }
      } catch (error) {
        console.error("Error tracking GitHub login session:", error);
      }
      
      res.redirect("/");
    }
  );

  app.get("/auth/google", passport.authenticate("google"));
  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/auth" }),
    async (req, res) => {
      try {
        // Track the user session on successful login
        if (req.user && req.sessionID) {
          await storage.createUserSession(
            req.user.id,
            req.sessionID,
            req.headers['user-agent'],
            req.ip
          );
        }
      } catch (error) {
        console.error("Error tracking Google login session:", error);
      }
      
      res.redirect("/");
    }
  );

  // Create a token for password reset requests
  function generateResetToken(userId: number, email: string): string {
    // Create a unique token based on userId, email and a timestamp
    // Format: sha256(userId + email + timestamp + SECRET)
    const timestamp = Date.now();
    const tokenData = `${userId}:${email}:${timestamp}:${process.env.SESSION_SECRET}`;
    return createHash('sha256').update(tokenData).digest('hex');
  }

  // Verify a reset token
  async function verifyResetToken(token: string, userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return false;
      
      // Check if reset was requested in the last hour
      if (!user.resetAt) return false;
      
      const resetTime = new Date(user.resetAt).getTime();
      const now = Date.now();
      
      // Token valid for 1 hour
      if (now - resetTime > 60 * 60 * 1000) return false;
      
      // Regenerate token and compare
      const expectedToken = generateResetToken(userId, user.email);
      
      // Use constant time comparison to prevent timing attacks
      return timingSafeEqual(
        Buffer.from(token), 
        Buffer.from(expectedToken)
      );
    } catch (error) {
      console.error('Error verifying reset token:', error);
      return false;
    }
  }

  // Request password reset - sends a link with a token
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      // Validate the email
      const { email } = requestPasswordResetSchema.parse(req.body);
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Still return success to prevent email enumeration
        return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
      }

      // Throttle: allow reset request once per hour
      if (user.resetAt && new Date().getTime() - new Date(user.resetAt).getTime() < 60 * 60 * 1000) {
        return res.status(429).json({ message: "Please wait before requesting another reset" });
      }

      // Update reset timestamp
      await storage.updateResetTimestamp(user.id);
      
      // Generate token
      const resetToken = generateResetToken(user.id, user.email);
      
      // Create reset link
      const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
      const resetLink = `${baseUrl}/reset-password?userId=${user.id}&token=${resetToken}`;
      
      // Send email with reset link
      await sendPasswordResetLink(email, resetToken, resetLink);
      
      res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    } catch (error: any) {
      console.error("Password reset error:", error);
      
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid email", errors: error.errors });
      }
      
      res.status(500).json({ message: "Server error during password reset" });
    }
  });
  
  // Verify reset token and set new password
  app.post("/api/reset-password", async (req, res) => {
    try {
      // Validate with resetPasswordSchema
      const { userId, token, newPassword } = resetPasswordSchema.parse(req.body);
      
      // Verify the token
      const isValidToken = await verifyResetToken(token, userId);
      if (!isValidToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the password
      await storage.updateUserPassword(userId, hashedPassword);
      
      // Clear the reset timestamp
      await storage.clearResetTimestamp(userId);
      
      res.status(200).json({ message: "Password has been updated successfully" });
    } catch (error: any) {
      console.error("Password update error:", error);
      
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid reset data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Server error during password reset" });
    }
  });
  
  // Legacy password reset with temporary password (for admin-created accounts)
  app.post("/api/admin/reset-password", ensureAuthenticated, async (req, res) => {
    try {
      const { email } = req.body;
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate temporary password
      const tempPassword = randomBytes(8).toString("hex");
      const hashedPassword = await hashPassword(tempPassword);
      
      // Update user's password and reset timestamp
      await storage.updateUserPassword(user.id, hashedPassword);
      
      // Send email with temporary password
      await sendTempPassword(email, tempPassword);
      
      res.status(200).json({ message: "Temporary password has been sent" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Server error during password reset" });
    }
  });

  // User management (admin only)
  app.get("/api/users", ensureAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({ id: u.id, email: u.email, createdAt: u.createdAt })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", ensureAuthenticated, async (req, res) => {
    try {
      const { email } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Generate temporary password
      const tempPassword = randomBytes(8).toString("hex");
      const hashedPassword = await hashPassword(tempPassword);
      
      // Create new user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
      });
      
      // Send email with temporary password
      await sendTempPassword(email, tempPassword);
      
      res.status(201).json({ id: user.id, email: user.email });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.delete("/api/users/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await storage.deleteUser(id);
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
}

function ensureAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
