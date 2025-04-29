import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { logger, logRequest } from "./logger";
import helmet from "helmet";
import compression from "compression";

const app = express();

// Apply production middleware
if (process.env.NODE_ENV === 'production') {
  // Add compression for better performance
  app.use(compression());
  
  // Add Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://platform-lookaside.fbsbx.com", "https://avatars.githubusercontent.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://api.openai.com"]
      }
    }
  }));
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture JSON responses for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log request completion
  res.on("finish", () => {
    const duration = Date.now() - start;
    
    // Only log API requests
    if (path.startsWith("/api")) {
      // In development, log with response data (truncated for large responses)
      // In production, response data will be automatically omitted by the logger
      logRequest(
        req.method, 
        path, 
        res.statusCode, 
        duration, 
        capturedJsonResponse
      );
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log error in development, but not in production to avoid leaking sensitive info
    if (process.env.NODE_ENV !== 'production') {
      console.error(err);
    } else {
      // In production, log only non-sensitive error info
      console.error(`Error ${status}: ${message}`);
    }

    // Always return a clean error message to the client
    res.status(status).json({ 
      message: process.env.NODE_ENV === 'production' && status === 500 
        ? 'Internal Server Error' 
        : message 
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info(`Server started and listening on port ${port}`);
  });
})();
