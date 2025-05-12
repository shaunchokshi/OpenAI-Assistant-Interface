import express from "express";
import compression from "compression";
import helmet from "helmet";
import path from "path";
import { registerRoutes } from "./routes";
import { logger } from "./logger";

// Configure the Express app
const app = express();

// Apply security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for simplicity, enable with proper configuration for production
}));

// Compression middleware
app.use(compression());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
const distPath = path.resolve(import.meta.dirname, "public");
app.use(express.static(distPath));

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