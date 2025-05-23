FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all files
COPY . .

# Make sure we're not using @neondatabase/serverless
RUN npm uninstall @neondatabase/serverless || true

# Ensure all possible static file directories exist
RUN mkdir -p dist/public dist/client dist/server server/public public

# Build the client - this will output to dist/public as defined in vite.config.ts
RUN npx vite build

# List what was built to verify output
RUN ls -la dist/public

# Copy the Vite build output to all the possible directories our app might look for it
RUN cp -r dist/public/* dist/client/ || true
RUN cp -r dist/public/* public/ || true
RUN cp -r dist/public/* server/public/ || true
RUN cp dist/public/index.html dist/ || true

# Build the server - make sure to build to the right directory
RUN npx esbuild server/*.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server

# Create a more lightweight production image
FROM node:20-slim

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package files from builder and install dependencies with dev dependencies for Vite
COPY --from=builder /app/package*.json ./
RUN npm ci --include=dev

# Make sure we have pg installed and don't have @neondatabase/serverless
RUN npm uninstall @neondatabase/serverless || true
RUN npm install pg
RUN npm install @vitejs/plugin-react

# Copy built application (both backend and frontend)
COPY --from=builder /app/dist ./dist

# Make sure these directories exist in the production image
RUN mkdir -p dist/public dist/client server/public public

# Copy production server and utility files
COPY --from=builder /app/production-server.js ./
COPY --from=builder /app/build-for-production.sh ./
COPY --from=builder /app/check-database.js ./
COPY --from=builder /app/fallback.html ./

# Copy our new database initialization script
COPY initialize-database.js ./

# Copy the Drizzle configuration file
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/shared/schema.ts ./shared/

# Ensure we have drizzle-kit for migrations
RUN npm install -g drizzle-kit

# Ensure files are executable
RUN chmod +x production-server.js check-database.js build-for-production.sh initialize-database.js

# Create directories for logs and uploads
RUN mkdir -p logs uploads/threads

# Expose the application port
EXPOSE 5000

# Set node to use maximum old space size
ENV NODE_OPTIONS=--max-old-space-size=2048

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Run the production server that doesn't depend on Vite
CMD ["node", "--experimental-specifier-resolution=node", "production-server.js"]