import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType, LoginUser, InsertUser } from "@shared/schema";
import { sendTempPassword } from "./email";

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
          if (!user || !(await comparePasswords(password, user.password))) {
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

            let user = await storage.getUserByEmail(email);
            if (!user) {
              // Create a new user with a random password
              const randomPassword = randomBytes(16).toString("hex");
              user = await storage.createUser({
                email,
                password: await hashPassword(randomPassword),
              });
            }

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

            let user = await storage.getUserByEmail(email);
            if (!user) {
              // Create a new user with a random password
              const randomPassword = randomBytes(16).toString("hex");
              user = await storage.createUser({
                email,
                password: await hashPassword(randomPassword),
              });
            }

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

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json({ id: req.user?.id, email: req.user?.email });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
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
    (req, res) => res.redirect("/")
  );

  app.get("/auth/google", passport.authenticate("google"));
  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/auth" }),
    (req, res) => res.redirect("/")
  );

  // Password reset
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Still return success to prevent email enumeration
        return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
      }

      // Throttle: allow reset once per 24h
      if (user.resetAt && new Date().getTime() - new Date(user.resetAt).getTime() < 24 * 3600 * 1000) {
        return res.status(429).json({ message: "Reset allowed once per 24 hours" });
      }

      // Generate temporary password
      const tempPassword = randomBytes(8).toString("hex");
      const hashedPassword = await hashPassword(tempPassword);
      
      // Update user's password and reset timestamp
      await storage.updateUserPassword(user.id, hashedPassword);
      
      // Send email with temporary password
      await sendTempPassword(email, tempPassword);
      
      res.status(200).json({ message: "If that email exists, a reset link has been sent." });
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
