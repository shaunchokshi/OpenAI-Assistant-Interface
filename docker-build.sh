#!/bin/bash

# Display a helpful message
echo "Building Docker containers for production..."

# Run our custom build script to ensure all files are properly built
echo "Building application..."
./build.sh

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "❌ Build failed! Please fix the errors before continuing."
  exit 1
fi

# Build Docker containers
echo "Building Docker containers..."
docker-compose build

# Check if Docker build was successful
if [ $? -eq 0 ]; then
  echo "✓ Docker build completed successfully!"
  echo -e "\nYou can now run containers with:"
  echo "  docker-compose up -d"
  echo -e "\nTo view logs, run:"
  echo "  docker-compose logs -f"
else
  echo "❌ Docker build failed!"
fi