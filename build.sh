#!/bin/bash

# Build the application for production
echo "Building application for production..."

# First build the frontend with vite
echo "Building frontend assets..."
npx vite build

# Build the backend with esbuild
echo "Building backend..."
npx esbuild server/**/*.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "✓ Build completed successfully!"
  
  # Show the build directory structure
  echo -e "\nBuild directory structure:"
  ls -la dist/
  echo -e "\nFrontend assets:"
  ls -la dist/public/
  
  echo -e "\nBuild completed successfully. You can now run:"
  echo "  docker-compose build"
  echo "  docker-compose up"
else
  echo "❌ Build failed!"
fi