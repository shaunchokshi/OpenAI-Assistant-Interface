FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all files
COPY . .

# Build the application
RUN npm run build

# Create a more lightweight production image
FROM node:20-slim

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package files from builder and install production dependencies only
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

# Copy built application (both backend and frontend)
COPY --from=builder /app/dist ./dist

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
CMD ["node", "dist/index.js"]