#!/bin/bash

echo "Building OpenAI Assistants Platform Production Image"
echo "===================================================="

# First, build the frontend assets
echo "Step 1: Building frontend assets..."
npx vite build

# Create temp directory for production build
mkdir -p temp-prod

# Copy the server-prod.js file to ensure it's included in the build
echo "Step 2: Preparing production server entry point..."
cp server/server-prod.js temp-prod/

# Build the backend
echo "Step 3: Building backend..."
npx esbuild server/**/*.ts temp-prod/server-prod.js --platform=node --packages=external --bundle --format=esm --outdir=dist

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