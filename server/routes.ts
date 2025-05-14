import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import fileUpload from "express-fileupload";
import rateLimit from "express-rate-limit";
import { setupAuth } from "./auth";
import { cacheMiddleware } from "./cache";
import { chatWithAssistant, initThread, uploadFiles, validateUserApiKey, createOpenAIClient } from "./openai";
import { fetchOpenAIAssistants, importOpenAIAssistant, importMultipleAssistants } from "./assistant-import";
import { storage, hashApiKey } from "./storage";
import { apiKeySchema, assistantSchema, updateAssistantSchema, userPreferencesSchema, updateUserPreferencesSchema } from "@shared/schema";
import fs from "fs";
import { logger } from "./logger";
import { 
  getFineTunableModels, 
  createFineTuningJob, 
  getUserFineTuningJobs, 
  getFineTuningJobDetails,
  cancelFineTuningJob,
  getUserFineTunedModels,
  updateFineTunedModelStatus,
  deleteFineTunedModel
} from "./fine-tuning";

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

  // User sessions endpoint - get user's active sessions
  app.get("/api/user/sessions", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Get sessions from the database
      const sessions = await storage.getUserSessions(req.user.id);
      
      // Mark the current session
      const currentSessionId = req.sessionID;
      const sessionsWithCurrent = sessions.map(session => ({
        ...session,
        isCurrent: session.sessionId === currentSessionId
      }));
      
      return res.json(sessionsWithCurrent);
    } catch (error) {
      logger.error(`Error fetching user sessions: ${error}`);
      return res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });
  
  // Terminate specific session
  app.delete("/api/user/sessions/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      await storage.terminateUserSession(sessionId);
      return res.json({ message: "Session terminated successfully" });
    } catch (error) {
      logger.error(`Error terminating session: ${error}`);
      return res.status(500).json({ error: "Failed to terminate session" });
    }
  });
  
  // Terminate all sessions except current
  app.delete("/api/user/sessions", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      await storage.terminateAllUserSessions(req.user.id, req.sessionID);
      return res.json({ message: "All other sessions terminated successfully" });
    } catch (error) {
      logger.error(`Error terminating all sessions: ${error}`);
      return res.status(500).json({ error: "Failed to terminate sessions" });
    }
  });

  // User config endpoint - get information about user's configuration
  app.get("/api/user/config", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      console.log("Fetching user config for user ID:", req.user.id);
      
      // Get the user from the database
      const user = await storage.getUser(req.user.id);
      if (!user) {
        console.error("User not found for ID:", req.user.id);
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get the user's assistants
      const assistants = await storage.getUserAssistants(req.user.id);
      
      // Log the user's API key status
      console.log("User API key status:", {
        userId: user.id,
        email: user.email,
        hasApiKey: !!user.openaiKeyHash,
        apiKeyAddedAt: user.openaiKeyAddedAt,
        apiKeyHashLength: user.openaiKeyHash?.length || 0
      });
      
      // Return only what's needed for configuration
      const configResponse = {
        hasApiKey: !!user.openaiKeyHash,
        apiKeyAddedAt: user.openaiKeyAddedAt, // Include when the API key was added
        defaultAssistantId: user.defaultAssistantId,
        assistantsCount: assistants.length
      };
      
      console.log("Returning user config:", configResponse);
      
      return res.json(configResponse);
    } catch (error) {
      console.error("Error fetching user config:", error);
      return res.status(500).json({ error: "Failed to fetch user configuration" });
    }
  });

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
  
  // Get user preferences
  app.get("/api/settings/preferences", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Get user preferences from database
      const preferences = await storage.getUserPreferences(req.user.id);
      
      if (!preferences) {
        // Return default preferences if none exist yet
        return res.json({
          theme: "dark",
          accentColor: "#7C3AED", // Default purple
          backgroundColor: "#1E293B", // Default dark blue-gray
          foregroundColor: "#FFFFFF" // Default white
        });
      }
      
      return res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      return res.status(500).json({ error: "Failed to fetch user preferences" });
    }
  });
  
  // Update user preferences
  app.post("/api/settings/preferences", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Validate preferences data
      const preferencesData = updateUserPreferencesSchema.parse(req.body);
      
      // Update or create preferences
      const preferences = await storage.updateUserPreferences(req.user.id, preferencesData);
      
      return res.json(preferences);
    } catch (error: any) {
      console.error("Error updating user preferences:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid preferences data", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to update user preferences" });
    }
  });
  
  // Assistants CRUD
  // List user's assistants
  app.get("/api/assistants", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Get user to check default assistant
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get assistants
      const assistants = await storage.getUserAssistants(req.user.id);
      
      // Add isDefault flag to each assistant
      const assistantsWithDefault = assistants.map(assistant => ({
        ...assistant,
        isDefault: user.defaultAssistantId === assistant.id
      }));
      
      return res.json(assistantsWithDefault);
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

  // File Management Endpoints
  
  // Get user's files
  app.get("/api/files", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const files = await storage.getUserFiles(req.user.id);
      return res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      return res.status(500).json({ error: "Failed to fetch files" });
    }
  });
  
  // Upload a file
  app.post("/api/files/upload", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Check if file was uploaded
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ error: "No file was uploaded" });
      }
      
      // Log what's in the request for debugging
      console.log("Files in request:", Object.keys(req.files));
      
      // Check if the 'file' field exists
      if (!req.files.file) {
        return res.status(400).json({ error: "File must be uploaded with field name 'file'" });
      }
      
      const uploadedFile = req.files.file as fileUpload.UploadedFile;
      const purpose = req.body.purpose || "assistants";
      
      // Validate purpose
      const validPurposes = ["assistants", "fine-tuning", "assistants_output"];
      if (!validPurposes.includes(purpose)) {
        return res.status(400).json({ error: "Invalid purpose. Must be one of: assistants, fine-tuning, assistants_output" });
      }
      
      // Validate file size (50MB limit)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (!uploadedFile.size) {
        return res.status(400).json({ error: "Unable to determine file size" });
      }
      
      if (uploadedFile.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: "File size exceeds 50MB limit" });
      }
      
      // Instead of relying on OpenAI integration right now, let's just store the file in the database
      try {
        // Store file reference in database directly without sending to OpenAI
        // This is a temporary solution until the OpenAI integration is fixed
        const storedFile = await storage.addFile(
          req.user.id,
          `local_${Date.now()}`, // Generate a local ID until OpenAI integration works
          uploadedFile.name,
          purpose,
          uploadedFile.size,
          undefined // not associated with an assistant yet
        );
        
        // Return the stored file details
        return res.status(201).json(storedFile);
      } catch (error: any) {
        console.error("Database storage error:", error);
        return res.status(500).json({ 
          error: "Failed to store file record in database",
          details: error.message || "Unknown error"
        });
      }
      
      /* Original OpenAI implementation - commented for now 
      // Real implementation with OpenAI is below - will be enabled once OpenAI API integration is fixed
      try {
        // Validate OpenAI API key
        const validationResult = validateUserApiKey(req.user);
        if (validationResult) {
          return res.status(400).json(validationResult);
        }
        
        // Create OpenAI client with user's API key
        const openai = createOpenAIClient(req.user.openaiKeyHash!);
        
        // Upload file to OpenAI
        const file = await openai.files.create({
          file: fs.createReadStream(uploadedFile.tempFilePath),
          purpose: purpose,
        });
        
        // Store file reference in database
        const storedFile = await storage.addFile(
          req.user.id,
          file.id,
          uploadedFile.name,
          purpose,
          uploadedFile.size,
          undefined // not associated with an assistant yet
        );
        
        // Clean up temp file
        fs.unlinkSync(uploadedFile.tempFilePath);
        
        res.status(201).json(storedFile);
      } catch (error: any) {
        // Clean up temp file
        if (uploadedFile.tempFilePath) {
          fs.unlinkSync(uploadedFile.tempFilePath);
        }
        
        console.error("OpenAI file upload error:", error);
        
        if (error.status === 401) {
          return res.status(401).json({ error: "Invalid OpenAI API key" });
        }
        
        return res.status(500).json({ 
          error: "Failed to upload file to OpenAI",
          details: error.message
        });
      }
      */
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Internal server error during file upload" });
    }
  });
  
  // Delete a file
  app.delete("/api/files/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const fileId = parseInt(req.params.id, 10);
      
      // First get the file to check permissions and get the OpenAI file ID
      const files = await storage.getUserFiles(req.user.id);
      const file = files.find(f => f.id === fileId);
      
      if (!file) {
        return res.status(404).json({ error: "File not found or you don't have permission to delete it" });
      }
      
      // For now, just delete the file from our database without interacting with OpenAI
      try {
        // Delete file reference from database
        await storage.deleteFile(fileId);
        
        return res.status(200).json({ message: "File deleted successfully" });
      } catch (error: any) {
        console.error("Database file deletion error:", error);
        
        return res.status(500).json({ 
          error: "Failed to delete file from database",
          details: error.message
        });
      }
    } catch (error) {
      console.error("File deletion error:", error);
      return res.status(500).json({ error: "Internal server error during file deletion" });
    }
  });
  
  // Original OpenAI file implementation - commented for now
  /*
  app.delete("/api/files/:id", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const fileId = parseInt(req.params.id, 10);
      
      // First get the file to check permissions and get the OpenAI file ID
      const files = await storage.getUserFiles(req.user.id);
      const file = files.find(f => f.id === fileId);
      
      if (!file) {
        return res.status(404).json({ error: "File not found or you don't have permission to delete it" });
      }
      
      // Validate OpenAI API key
      const validationResult = validateUserApiKey(req.user);
      if (validationResult) {
        return res.status(400).json(validationResult);
      }
      
      // Create OpenAI client with user's API key (we know it exists after validation)
      const openai = createOpenAIClient(req.user.openaiKeyHash!);
      
      try {
        // Delete file from OpenAI
        await openai.files.del(file.openaiFileId);
        
        // Delete file reference from database
        await storage.deleteFile(fileId);
        
        return res.status(200).json({ message: "File deleted successfully" });
      } catch (error: any) {
        console.error("OpenAI file deletion error:", error);
        
        // If the file doesn't exist on OpenAI's side, still delete it from our database
        if (error.status === 404) {
          await storage.deleteFile(fileId);
          return res.status(200).json({ message: "File deleted from database (was already deleted from OpenAI)" });
        }
        
        if (error.status === 401) {
          return res.status(401).json({ error: "Invalid OpenAI API key" });
        }
        
        return res.status(500).json({ 
          error: "Failed to delete file from OpenAI",
          details: error.message
        });
      }
    } catch (error) {
      console.error("File deletion error:", error);
      return res.status(500).json({ error: "Internal server error during file deletion" });
    }
  });
  */

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

  // Analytics endpoints
  
  // Get detailed usage analytics with filtering options
  app.get("/api/analytics/usage", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const { startDate, endDate, limit, offset } = req.query;
      
      const options: any = {};
      
      if (startDate) {
        options.startDate = new Date(startDate as string);
      }
      
      if (endDate) {
        options.endDate = new Date(endDate as string);
      }
      
      if (limit) {
        options.limit = parseInt(limit as string);
      }
      
      if (offset) {
        options.offset = parseInt(offset as string);
      }
      
      const usageData = await storage.getUserUsageAnalytics(req.user.id, options);
      
      res.status(200).json(usageData);
    } catch (error: any) {
      console.error("Error fetching usage analytics:", error);
      res.status(500).json({ error: "Failed to fetch usage analytics" });
    }
  });
  
  // Get summarized usage analytics with grouping options
  app.get("/api/analytics/summary", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const { startDate, endDate, groupBy } = req.query;
      
      const options: any = {};
      
      if (startDate) {
        options.startDate = new Date(startDate as string);
      }
      
      if (endDate) {
        options.endDate = new Date(endDate as string);
      }
      
      if (groupBy && ['day', 'week', 'month'].includes(groupBy as string)) {
        options.groupBy = groupBy;
      }
      
      const summary = await storage.getUserUsageSummary(req.user.id, options);
      
      res.status(200).json(summary);
    } catch (error: any) {
      console.error("Error fetching usage summary:", error);
      res.status(500).json({ error: "Failed to fetch usage summary" });
    }
  });

  // Fine-tuning API routes
  // Get available models for fine-tuning
  app.get("/api/fine-tuning/models", ensureAuthenticated, getFineTunableModels);
  
  // Create a new fine-tuning job
  app.post("/api/fine-tuning/jobs", ensureAuthenticated, createFineTuningJob);
  
  // Get user's fine-tuning jobs
  app.get("/api/fine-tuning/jobs", ensureAuthenticated, getUserFineTuningJobs);
  
  // Get details for a specific fine-tuning job
  app.get("/api/fine-tuning/jobs/:id", ensureAuthenticated, getFineTuningJobDetails);
  
  // Cancel a fine-tuning job
  app.post("/api/fine-tuning/jobs/:id/cancel", ensureAuthenticated, cancelFineTuningJob);
  
  // Get user's fine-tuned models
  app.get("/api/fine-tuning/models/custom", ensureAuthenticated, getUserFineTunedModels);
  
  // Update fine-tuned model status (active/inactive)
  app.patch("/api/fine-tuning/models/custom/:id", ensureAuthenticated, updateFineTunedModelStatus);
  
  // Delete (deactivate) a fine-tuned model
  app.delete("/api/fine-tuning/models/custom/:id", ensureAuthenticated, deleteFineTunedModel);

  const httpServer = createServer(app);
  return httpServer;
}