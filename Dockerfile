FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all files
COPY . .

# Make sure we're not using @neondatabase/serverless
RUN npm uninstall @neondatabase/serverless || true

# Build the client
RUN npx vite build

# Build the server
RUN npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

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

# Create a dedicated production server file that doesn't use Vite
RUN echo '#!/usr/bin/env node\n\
import path from "path";\n\
import express from "express";\n\
import compression from "compression";\n\
import helmet from "helmet";\n\
import { registerRoutes } from "./dist/server/routes.js";\n\
import { logger } from "./dist/server/logger.js";\n\
\n\
const app = express();\n\
\n\
// Apply security headers\n\
app.use(helmet({\n\
  contentSecurityPolicy: {\n\
    directives: {\n\
      defaultSrc: ["\'self\'"],\n\
      scriptSrc: ["\'self\'", "\'unsafe-inline\'", "\'unsafe-eval\'"],\n\
      styleSrc: ["\'self\'", "\'unsafe-inline\'", "https://fonts.googleapis.com"],\n\
      imgSrc: ["\'self\'", "data:", "https://platform-lookaside.fbsbx.com", "https://avatars.githubusercontent.com"],\n\
      fontSrc: ["\'self\'", "https://fonts.gstatic.com"],\n\
      connectSrc: ["\'self\'", "https://api.openai.com"]\n\
    }\n\
  }\n\
}));\n\
\n\
// Compression middleware\n\
app.use(compression());\n\
\n\
// Body parsers\n\
app.use(express.json({ limit: "50mb" }));\n\
app.use(express.urlencoded({ extended: false, limit: "50mb" }));\n\
\n\
// Serve static assets\n\
const distPath = path.resolve("./dist/client");\n\
app.use(express.static(distPath));\n\
\n\
async function startServer() {\n\
  // Register API routes\n\
  const server = await registerRoutes(app);\n\
\n\
  // Serve SPA index.html for all other routes\n\
  app.get("*", (req, res) => {\n\
    res.sendFile(path.resolve(distPath, "index.html"));\n\
  });\n\
\n\
  // Start the server\n\
  const PORT = process.env.PORT || 5000;\n\
  server.listen(PORT, "0.0.0.0", () => {\n\
    logger.info(`Server started and listening on port ${PORT}`);\n\
  });\n\
\n\
  // Handle graceful shutdown\n\
  process.on("SIGTERM", () => {\n\
    logger.info("SIGTERM signal received, shutting down server");\n\
    server.close(() => {\n\
      logger.info("Server closed");\n\
      process.exit(0);\n\
    });\n\
  });\n\
}\n\
\n\
startServer().catch(err => {\n\
  console.error("Failed to start server:", err);\n\
  process.exit(1);\n\
});\n\
' > production-server.js

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