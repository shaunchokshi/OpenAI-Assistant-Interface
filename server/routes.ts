import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import fileUpload from "express-fileupload";
import rateLimit from "express-rate-limit";
import { setupAuth } from "./auth";
import { cacheMiddleware } from "./cache";
import { chatWithAssistant, initThread, uploadFiles } from "./openai";
import { storage, hashApiKey } from "./storage";
import { apiKeySchema, assistantSchema, updateAssistantSchema } from "@shared/schema";

// Format uptime into human-readable string
function formatUptime(uptime: number): string {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  
  return parts.join(' ');
}

// Middleware to ensure user is authenticated
function ensureAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up file upload middleware
  app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  }));

  // Set up authentication
  setupAuth(app);

  // Set up rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: "Too many requests, please try again later." }
  });

  // More aggressive rate limiting for auth endpoints to prevent brute force
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 authentication attempts per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts, please try again later." }
  });

  // Apply the rate limiting middleware to API calls only if in production
  if (process.env.NODE_ENV === 'production') {
    app.use('/api/login', authLimiter);
    app.use('/api/register', authLimiter);
    app.use('/api/', apiLimiter);
  }

  // User API Key Management
  app.post("/api/settings/apikey", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { apiKey } = apiKeySchema.parse(req.body);
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Hash the API key before storage
      const apiKeyHash = hashApiKey(apiKey);
      
      // Update the user's API key in the database
      await storage.updateUserOpenAIKey(req.user.id, apiKeyHash);
      
      return res.status(200).json({ message: "API key updated successfully" });
    } catch (error: any) {
      console.error("Error updating API key:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid API key format", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to update API key" });
    }
  });
  
  // User's Default Assistant
  app.post("/api/settings/default-assistant", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { assistantId } = req.body;
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // If assistantId is provided, verify it belongs to the user
      if (assistantId) {
        const assistant = await storage.getAssistant(assistantId);
        if (!assistant) {
          return res.status(404).json({ error: "Assistant not found" });
        }
        if (assistant.userId !== req.user.id) {
          return res.status(403).json({ error: "You don't have access to this assistant" });
        }
      }
      
      // Update the user's default assistant
      await storage.updateDefaultAssistant(req.user.id, assistantId || null);
      
      return res.status(200).json({ message: "Default assistant updated successfully" });
    } catch (error) {
      console.error("Error updating default assistant:", error);
      return res.status(500).json({ error: "Failed to update default assistant" });
    }
  });
  
  // Assistants CRUD
  // List user's assistants
  app.get("/api/assistants", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const assistants = await storage.getUserAssistants(req.user.id);
      return res.json(assistants);
    } catch (error) {
      console.error("Error fetching assistants:", error);
      return res.status(500).json({ error: "Failed to fetch assistants" });
    }
  });
  
  // Get a specific assistant
  app.get("/api/assistants/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const assistantId = parseInt(req.params.id, 10);
      const assistant = await storage.getAssistant(assistantId);
      
      if (!assistant) {
        return res.status(404).json({ error: "Assistant not found" });
      }
      
      if (assistant.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this assistant" });
      }
      
      return res.json(assistant);
    } catch (error) {
      console.error("Error fetching assistant:", error);
      return res.status(500).json({ error: "Failed to fetch assistant" });
    }
  });
  
  // Create a new assistant
  app.post("/api/assistants", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Validate assistant data
      const assistantData = assistantSchema.parse(req.body);
      
      // Create the assistant in the database
      const assistant = await storage.createAssistant({
        ...assistantData,
        userId: req.user.id
      });
      
      return res.status(201).json(assistant);
    } catch (error: any) {
      console.error("Error creating assistant:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid assistant data", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to create assistant" });
    }
  });
  
  // Update an assistant
  app.patch("/api/assistants/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const assistantId = parseInt(req.params.id, 10);
      
      // Verify the assistant exists and belongs to the user
      const existingAssistant = await storage.getAssistant(assistantId);
      if (!existingAssistant) {
        return res.status(404).json({ error: "Assistant not found" });
      }
      
      if (existingAssistant.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this assistant" });
      }
      
      // Validate update data
      const updateData = updateAssistantSchema.parse(req.body);
      
      // Update the assistant
      const assistant = await storage.updateAssistant(assistantId, updateData);
      
      return res.json(assistant);
    } catch (error: any) {
      console.error("Error updating assistant:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid assistant data", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to update assistant" });
    }
  });
  
  // Delete an assistant
  app.delete("/api/assistants/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const assistantId = parseInt(req.params.id, 10);
      
      // Verify the assistant exists and belongs to the user
      const existingAssistant = await storage.getAssistant(assistantId);
      if (!existingAssistant) {
        return res.status(404).json({ error: "Assistant not found" });
      }
      
      if (existingAssistant.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this assistant" });
      }
      
      // If this is the user's default assistant, clear that setting
      const user = await storage.getUser(req.user.id);
      if (user && user.defaultAssistantId === assistantId) {
        await storage.updateDefaultAssistant(req.user.id, null);
      }
      
      // Delete the assistant
      await storage.deleteAssistant(assistantId);
      
      return res.status(200).json({ message: "Assistant deleted successfully" });
    } catch (error) {
      console.error("Error deleting assistant:", error);
      return res.status(500).json({ error: "Failed to delete assistant" });
    }
  });
  
  // Thread management
  app.get("/api/threads", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const threads = await storage.getUserThreads(req.user.id);
      return res.json(threads);
    } catch (error) {
      console.error("Error fetching threads:", error);
      return res.status(500).json({ error: "Failed to fetch threads" });
    }
  });
  
  app.get("/api/threads/:id/messages", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const threadId = parseInt(req.params.id, 10);
      
      // Verify the thread exists and belongs to the user
      const thread = await storage.getThread(threadId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      
      if (thread.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this thread" });
      }
      
      const messages = await storage.getThreadMessages(threadId);
      return res.json(messages);
    } catch (error) {
      console.error("Error fetching thread messages:", error);
      return res.status(500).json({ error: "Failed to fetch thread messages" });
    }
  });
  
  app.patch("/api/threads/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const threadId = parseInt(req.params.id, 10);
      const { title } = req.body;
      
      // Verify the thread exists and belongs to the user
      const thread = await storage.getThread(threadId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      
      if (thread.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this thread" });
      }
      
      if (title) {
        await storage.updateThreadTitle(threadId, title);
      }
      
      return res.status(200).json({ message: "Thread updated successfully" });
    } catch (error) {
      console.error("Error updating thread:", error);
      return res.status(500).json({ error: "Failed to update thread" });
    }
  });
  
  app.delete("/api/threads/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const threadId = parseInt(req.params.id, 10);
      
      // Verify the thread exists and belongs to the user
      const thread = await storage.getThread(threadId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      
      if (thread.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this thread" });
      }
      
      await storage.deleteThread(threadId);
      
      return res.status(200).json({ message: "Thread deleted successfully" });
    } catch (error) {
      console.error("Error deleting thread:", error);
      return res.status(500).json({ error: "Failed to delete thread" });
    }
  });
  
  // OpenAI Assistant routes
  app.post("/api/thread/new", ensureAuthenticated, initThread);
  app.post("/api/chat", ensureAuthenticated, chatWithAssistant);
  app.post("/api/upload", ensureAuthenticated, uploadFiles);
  app.post("/api/upload-directory", ensureAuthenticated, uploadFiles);

  // Health check with 1-minute cache
  app.get("/api/health", cacheMiddleware(60), async (req, res) => {
    try {
      // Collect system metrics
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // Basic system health
      const health = { 
        status: "ok",
        version: "1.0",
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: uptime,
          formatted: formatUptime(uptime)
        },
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        }
      };
      
      res.json(health);
    } catch (error) {
      // Even if metrics collection fails, return a 200 OK but with warning
      res.json({ 
        status: "degraded",
        message: "Health check succeeded but metrics collection failed",
        timestamp: new Date().toISOString()
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}