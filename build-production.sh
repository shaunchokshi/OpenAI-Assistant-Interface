#!/bin/bash

# Build the application specifically for production with Docker
echo "Building application for production..."

# Create production directory if it doesn't exist
mkdir -p production

# First build the frontend with vite
echo "Building frontend assets..."
npx vite build

# Create a simple production server file that doesn't import Vite
cat > production/server.js << 'EOL'
import express from "express";
import compression from "compression";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { registerRoutes } from "../dist/routes.js";

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
const distPath = path.resolve(__dirname, "../dist/public");
app.use(express.static(distPath));

// Serve SPA index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.resolve(distPath, "index.html"));
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[${new Date().toISOString()}] Server started and listening on port ${PORT}`);
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

# Build the backend with esbuild (excluding the server.js entry point which will be replaced)
echo "Building backend..."
npx esbuild server/**/*.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Create a package.json just for production
cat > production/package.json << EOL
{
  "name": "openai-assistant-platform",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "NODE_ENV=production node server.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "compression": "^1.8.0",
    "connect-pg-simple": "^10.0.0",
    "drizzle-orm": "^0.39.1",
    "express": "^4.21.2",
    "express-fileupload": "^1.5.1",
    "express-rate-limit": "^7.5.0",
    "express-session": "^1.18.1",
    "helmet": "^8.1.0",
    "openai": "^4.96.2",
    "passport": "^0.7.0",
    "passport-github2": "^0.1.12",
    "passport-google-oauth20": "^2.0.0",
    "passport-local": "^1.0.0",
    "ws": "^8.18.0",
    "zod": "^3.24.2"
  }
}
EOL

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "✓ Build completed successfully!"
  
  # Show the build directory structure
  echo -e "\nBuild directory structure:"
  ls -la dist/
  echo -e "\nFrontend assets:"
  ls -la dist/public/
  echo -e "\nProduction files:"
  ls -la production/
  
  echo -e "\nUpdating Dockerfile for production build..."
  
  # Create a simpler Dockerfile for production
  cat > Dockerfile.prod << 'EOL'
FROM node:20-slim

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package files and install dependencies
COPY production/package.json ./
RUN npm install --omit=dev

# Copy built application
COPY dist ./dist
COPY production/server.js ./

# Create directories for logs and uploads
RUN mkdir -p logs uploads/threads

# Expose the application port
EXPOSE 5000

# Set node to use maximum old space size
ENV NODE_OPTIONS=--max-old-space-size=2048

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Run the application
CMD ["node", "server.js"]
EOL

  echo -e "\nBuild completed successfully. You can now run:"
  echo "  docker build -f Dockerfile.prod -t openai-assistant-platform:prod ."
  echo "  docker-compose -f docker-compose.prod.yml up -d"
  
  # Create a simplified docker-compose file for production
  cat > docker-compose.prod.yml << 'EOL'
version: '3.8'

services:
  app:
    build: 
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PGHOST=${PGHOST:-postgres}
      - PGUSER=${PGUSER}
      - PGPASSWORD=${PGPASSWORD}
      - PGDATABASE=${PGDATABASE}
      - PGPORT=${PGPORT:-5432}
      - SMTP_FROM=${SMTP_FROM}
      - SMTP_RELAY_SERVER=${SMTP_RELAY_SERVER}
      - SMTP_RELAY_PORT=${SMTP_RELAY_PORT}
      - SMTP_RELAY_USER=${SMTP_RELAY_USER}
      - SMTP_RELAY_PASSWORD=${SMTP_RELAY_PASSWORD}
      - GOOGLE_ID=${GOOGLE_ID}
      - GOOGLE_SECRET=${GOOGLE_SECRET}
      - GOOGLE_CALLBACK=${GOOGLE_CALLBACK}
      - GITHUB_ID=${GITHUB_ID}
      - GITHUB_SECRET=${GITHUB_SECRET}
      - GITHUB_CALLBACK=${GITHUB_CALLBACK}
    depends_on:
      - postgres
    restart: unless-stopped
    volumes:
      - app_logs:/app/logs
      - app_uploads:/app/uploads

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=${PGUSER}
      - POSTGRES_PASSWORD=${PGPASSWORD}
      - POSTGRES_DB=${PGDATABASE}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${PGUSER} -d ${PGDATABASE}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  app_logs:
  app_uploads:
EOL

else
  echo "❌ Build failed!"
fi