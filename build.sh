#!/bin/bash

# Build the application for production
echo "Building application for production..."

# Build the frontend and backend
npm run build

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