#!/bin/bash

echo "Building OpenAI Assistants Platform Production Image"
echo "===================================================="

# First, build the frontend assets
echo "Step 1: Building frontend assets..."
npx vite build

# Create temp directory for production build
mkdir -p temp-prod

# Create a specialized production server entry point 
echo "Step 2: Preparing production server entry point..."
cat > temp-prod/server-prod.js << 'EOL'
import express from "express";
import compression from "compression";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "../server/routes.js";

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure the Express app
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Register API routes
const server = await registerRoutes(app);

// Serve static assets
const distPath = path.resolve(__dirname, "public");
app.use(express.static(distPath));

// Serve SPA index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.resolve(distPath, "index.html"));
});

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, "0.0.0.0", () => {
  console.log(`[${new Date().toISOString()}] Server started and listening on port ${port}`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log(`[${new Date().toISOString()}] SIGTERM signal received, shutting down server`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed`);
    process.exit(0);
  });
});
EOL

# Build the backend separately
echo "Step 3: Building backend..."
npx esbuild server/**/*.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
npx esbuild temp-prod/server-prod.js --platform=node --packages=external --bundle --format=esm --outdir=dist

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Step 4: Building Docker image..."
  docker build -f Dockerfile.prod -t openai-assistant-platform:prod .
  
  if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "To run the production container:"
    echo "docker-compose -f docker-compose.prod.yml up -d"
  else
    echo "❌ Docker build failed!"
  fi
else
  echo "❌ Build failed!"
fi

# Clean up temp files
rm -rf temp-prod