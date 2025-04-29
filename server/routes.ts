import type { Express } from "express";
import { createServer, type Server } from "http";
import fileUpload from "express-fileupload";
import { setupAuth } from "./auth";
import { chatWithAssistant, initThread, uploadFiles } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up file upload middleware
  app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  }));

  // Set up authentication
  setupAuth(app);

  // OpenAI Assistant routes
  app.post("/api/thread/new", ensureAuthenticated, initThread);
  app.post("/api/chat", ensureAuthenticated, chatWithAssistant);
  app.post("/api/upload", ensureAuthenticated, uploadFiles);
  app.post("/api/upload-directory", ensureAuthenticated, uploadFiles);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Middleware to ensure user is authenticated
function ensureAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
