#!/usr/bin/env node
import path from "path";
import fs from "fs";
import express from "express";
import compression from "compression";
import helmet from "helmet";
import { registerRoutes } from "./dist/server/routes.js";
import { logger } from "./dist/server/logger.js";

const app = express();

// Apply security headers
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

// Compression middleware
app.use(compression());

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Determine the correct static files path - check both possible locations
let distPath;
if (fs.existsSync(path.resolve("./dist/public"))) {
  distPath = path.resolve("./dist/public");
  logger.info("Using static files from ./dist/public");
} else if (fs.existsSync(path.resolve("./server/public"))) {
  distPath = path.resolve("./server/public");
  logger.info("Using static files from ./server/public");
} else {
  // Fallback - check all possible directories
  const possibleDirs = [
    "./dist/public", 
    "./server/public", 
    "./dist/client", 
    "./public", 
    "./dist"
  ];
  
  for (const dir of possibleDirs) {
    if (fs.existsSync(path.resolve(dir))) {
      const files = fs.readdirSync(path.resolve(dir));
      if (files.includes("index.html")) {
        distPath = path.resolve(dir);
        logger.info(`Found static files in ${dir}`);
        break;
      }
    }
  }
  
  if (!distPath) {
    distPath = path.resolve("./dist");
    logger.warn("Could not find static files directory, using ./dist as fallback");
  }
}

// Serve static assets
app.use(express.static(distPath));

async function startServer() {
  // Check if we need to initialize the database
  try {
    logger.info("Running database initialization check...");
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Run database initialization
    await execAsync('node initialize-database.js');
    logger.info("Database initialization completed");
  } catch (err) {
    logger.error(`Database initialization error: ${err.message}`);
    // Continue despite errors to allow manual intervention
  }

  // Register API routes
  const server = await registerRoutes(app);

  // Ensure the public directory exists
  try {
    logger.info(`Serving static files from: ${distPath}`);
  } catch (err) {
    logger.error(`Error with static files: ${err.message}`);
  }

  // Log the contents of all possible static directories to debug
  logger.info("Checking all possible static directories:");
  ["./dist/public", "./server/public", "./dist/client", "./public", "./dist"].forEach(dir => {
    try {
      if (fs.existsSync(path.resolve(dir))) {
        const files = fs.readdirSync(path.resolve(dir));
        logger.info(`Directory ${dir} exists with files: ${files.join(', ')}`);
      } else {
        logger.info(`Directory ${dir} does not exist`);
      }
    } catch (err) {
      logger.error(`Error checking directory ${dir}: ${err.message}`);
    }
  });

  // Serve SPA index.html for all other routes
  app.get("*", (req, res) => {
    try {
      // Check if index.html exists in our chosen path
      const indexPath = path.resolve(distPath, "index.html");
      
      if (fs.existsSync(indexPath)) {
        logger.info(`Serving index from: ${indexPath}`);
        res.sendFile(indexPath);
      } else {
        // If not, try to find it elsewhere
        logger.warn(`Index not found at ${indexPath}, searching elsewhere...`);
        
        const possibleIndexPaths = [
          path.resolve("./dist/public/index.html"),
          path.resolve("./server/public/index.html"),
          path.resolve("./dist/client/index.html"),
          path.resolve("./public/index.html"),
          path.resolve("./dist/index.html")
        ];
        
        const foundIndexPath = possibleIndexPaths.find(p => fs.existsSync(p));
        
        if (foundIndexPath) {
          logger.info(`Found index at alternative location: ${foundIndexPath}`);
          res.sendFile(foundIndexPath);
        } else {
          const fallbackPath = path.resolve("./fallback.html");
          if (fs.existsSync(fallbackPath)) {
            logger.warn("Using fallback.html as a temporary solution");
            res.sendFile(fallbackPath);
          } else {
            logger.error("Could not find index.html in any location");
            res.status(404).send('Application not found');
          }
        }
      }
    } catch (err) {
      logger.error(`Error serving index: ${err.message}`);
      res.status(500).send('Error serving application');
    }
  });

  // Start the server
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server started and listening on port ${PORT}`);
  });

  // Handle graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received, shutting down server");
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});