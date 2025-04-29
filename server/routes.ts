import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import fileUpload from "express-fileupload";
import rateLimit from "express-rate-limit";
import { setupAuth } from "./auth";
import { cacheMiddleware } from "./cache";
import { chatWithAssistant, initThread, uploadFiles } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up file upload middleware
  app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  }));

  // Set up authentication
  setupAuth(app);

  // Set up rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: "Too many requests, please try again later." }
  });

  // More aggressive rate limiting for auth endpoints to prevent brute force
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 authentication attempts per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts, please try again later." }
  });

  // Apply the rate limiting middleware to API calls only if in production
  if (process.env.NODE_ENV === 'production') {
    app.use('/api/login', authLimiter);
    app.use('/api/register', authLimiter);
    app.use('/api/', apiLimiter);
  }

  // OpenAI Assistant routes
  app.post("/api/thread/new", ensureAuthenticated, initThread);
  app.post("/api/chat", ensureAuthenticated, chatWithAssistant);
  app.post("/api/upload", ensureAuthenticated, uploadFiles);
  app.post("/api/upload-directory", ensureAuthenticated, uploadFiles);

  // Health check with 1-minute cache
  app.get("/api/health", cacheMiddleware(60), (req, res) => {
    res.json({ 
      status: "ok", 
      version: "1.0",
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Middleware to ensure user is authenticated
function ensureAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
