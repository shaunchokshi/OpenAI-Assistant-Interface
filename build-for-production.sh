#!/bin/bash

# Exit on error
set -e

echo "=== Building application for production ==="

# Clean existing dist directory
rm -rf dist || true
mkdir -p dist/client dist/server

# Remove Neon Serverless dependency if it exists
npm uninstall @neondatabase/serverless || true

# Make sure we have pg installed
npm install pg --no-save

# Run normal build processes
echo "=== Building frontend with Vite ==="
npm run build

echo "=== Setting up production server ==="
cat > production-server.js << 'EOL'
#!/usr/bin/env node
import path from "path";
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

// Serve static assets
const distPath = path.resolve("./dist/client");
app.use(express.static(distPath));

async function startServer() {
  // Register API routes
  const server = await registerRoutes(app);

  // Serve SPA index.html for all other routes
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
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
EOL

echo "=== Setup complete, you can now run Docker Compose ==="
echo "Run 'docker-compose build --no-cache' to rebuild containers"
echo "Run 'docker-compose up -d' to start the application"