import OpenAI from "openai";
import { mkdir, writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { storage } from "./storage";
import { User, Assistant } from "@shared/schema";
import { logger } from "./logger";

// Fallback assistant ID - will only be used if user has no default and none is specified
const DEFAULT_ASSISTANT_ID = process.env.ASSISTANT_ID;

// Directory for logs
const LOG_DIR = "./logs";

// Ensure required directories exist
(async () => {
  try {
    await mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    logger.error("Error creating required directories:", error);
  }
})();

// Create a new OpenAI client for the user
function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey: apiKey,
  });
}

// Log messages to file
async function logMessage(role: string, text: string) {
  try {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${role.toUpperCase()}: ${text}\n`;
    const logFile = `${LOG_DIR}/chat-${timestamp.slice(0, 10)}.log`;
    await writeFile(logFile, line, { flag: "a" });
  } catch (error) {
    logger.error("Error logging message:", error);
  }
}

/**
 * Verify user has set up an OpenAI API key
 * @param user User object from request
 * @returns Error message if no API key is set, null if valid
 */
function validateUserApiKey(user: User): { error: string } | null {
  if (!user.openaiKeyHash) {
    return { error: "Please set up your OpenAI API key in settings before using this feature" };
  }
  return null;
}

/**
 * Initialize or get a thread for a user
 * Creates a new thread and stores it in the database
 */
export async function initThread(req: Request, res: Response) {
  try {
    const user = req.user as User;
    
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Verify user has an OpenAI API key
    const keyValidation = validateUserApiKey(user);
    if (keyValidation) {
      return res.status(400).json(keyValidation);
    }
    
    // Get API key from environment - in a real app you'd use a secure vault or user credential
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }
    
    // Create OpenAI client with user's API key
    const openai = createOpenAIClient(apiKey);
    
    // Create a new thread with OpenAI
    const thread = await openai.beta.threads.create();
    
    // Get the assistant ID - user's default or the one specified in the request
    const assistantId = req.body.assistantId || user.defaultAssistantId || null;
    
    // Store thread in database with the user and assistant association
    const dbThread = await storage.createThread(
      user.id, 
      assistantId, 
      thread.id,
      req.body.title || "New Conversation"
    );
    
    res.json({ 
      id: dbThread.id,
      openaiThreadId: dbThread.openaiThreadId,
      title: dbThread.title
    });
  } catch (err: any) {
    logger.error("Error initializing thread:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Chat with an assistant using a thread
 * Requires:
 * - User to be authenticated
 * - User to have an OpenAI API key
 * - A valid thread ID
 * - A message to send
 */
export async function chatWithAssistant(req: Request, res: Response) {
  try {
    const user = req.user as User;
    
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Verify user has an OpenAI API key
    const keyValidation = validateUserApiKey(user);
    if (keyValidation) {
      return res.status(400).json(keyValidation);
    }
    
    const { threadId, message } = req.body;
    
    if (!threadId || !message) {
      return res.status(400).json({ error: "Thread ID and message are required" });
    }
    
    // Get thread from database
    const thread = await storage.getThread(threadId);
    
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }
    
    // Verify thread belongs to the user
    if (thread.userId !== user.id) {
      return res.status(403).json({ error: "You don't have access to this thread" });
    }
    
    // Get the assistant to use
    let assistantId: string;
    
    if (thread.assistantId) {
      // If thread has an assistant assigned, use that
      const assistant = await storage.getAssistant(thread.assistantId);
      if (!assistant || !assistant.openaiAssistantId) {
        return res.status(404).json({ error: "Assistant not found or not configured" });
      }
      assistantId = assistant.openaiAssistantId;
    } else if (user.defaultAssistantId) {
      // Use user's default assistant
      const assistant = await storage.getAssistant(user.defaultAssistantId);
      if (!assistant || !assistant.openaiAssistantId) {
        return res.status(404).json({ error: "Default assistant not found or not configured" });
      }
      assistantId = assistant.openaiAssistantId;
    } else if (DEFAULT_ASSISTANT_ID) {
      // Use system default assistant as last resort
      assistantId = DEFAULT_ASSISTANT_ID;
    } else {
      return res.status(400).json({ 
        error: "No assistant configured. Please create an assistant or select a default assistant." 
      });
    }
    
    // Get API key from environment - in a real app you'd use a secure vault or user credential
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }
    
    // Create OpenAI client with user's API key
    const openai = createOpenAIClient(apiKey);
    
    // Log user message
    await logMessage("user", message);
    
    // Add message to database
    await storage.addMessage(threadId, "user", message);
    
    // Post user message to OpenAI thread
    await openai.beta.threads.messages.create(thread.openaiThreadId, {
      role: "user",
      content: message,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.openaiThreadId, {
      assistant_id: assistantId,
    });

    // Poll until complete
    let status = await openai.beta.threads.runs.retrieve(thread.openaiThreadId, run.id);
    
    // Simple polling mechanism - could be replaced with webhooks in production
    while (status.status !== "completed") {
      // 1-second delay between polls
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await openai.beta.threads.runs.retrieve(thread.openaiThreadId, run.id);
      
      // Handle failure cases
      if (["failed", "cancelled", "expired"].includes(status.status)) {
        return res.status(500).json({ 
          status: status.status,
          error: status.last_error?.message || `Run ${status.status}`
        });
      }
    }

    // Get assistant response messages
    const messages = await openai.beta.threads.messages.list(thread.openaiThreadId);
    
    // Find the latest assistant message from this run
    const assistantMsgs = messages.data
      .filter((m) => m.run_id === run.id && m.role === "assistant");
    
    if (assistantMsgs.length === 0) {
      return res.status(500).json({ error: "No assistant response found" });
    }
    
    // Process all content from assistant message
    const responseContent = [];
    
    for (const msg of assistantMsgs) {
      for (const content of msg.content) {
        if (content.type === "text") {
          const text = content.text.value;
          
          // Log assistant message
          await logMessage("assistant", text);
          
          // Add to database
          await storage.addMessage(threadId, "assistant", text, msg.id);
          
          // Add to response
          responseContent.push({
            type: "text",
            text: text
          });
        } 
        // Handle other content types (images, etc) if needed
      }
    }
    
    res.json({ 
      threadId,
      content: responseContent
    });
    
  } catch (err: any) {
    logger.error("Error chatting with assistant:", err);
    res.status(500).json({ error: err.message });
  }
}

// Get compatible files from directory
function getCompatibleFiles(dir: string, exts: string[]): string[] {
  let out: string[] = [];
  try {
    for (let name of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, name.name);
      if (name.isDirectory()) {
        out.push(...getCompatibleFiles(full, exts));
      } else if (exts.includes(path.extname(name.name).toLowerCase())) {
        out.push(full);
      }
    }
  } catch (error) {
    logger.error(`Error reading directory ${dir}:`, error);
  }
  return out;
}

/**
 * Upload files to an assistant
 * Adds files to OpenAI and associates them with the specified assistant
 */
export async function uploadFiles(req: Request, res: Response) {
  try {
    const user = req.user as User;
    
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Verify user has an OpenAI API key
    const keyValidation = validateUserApiKey(user);
    if (keyValidation) {
      return res.status(400).json(keyValidation);
    }
    
    // Get the assistant to upload to
    const assistantId = req.body.assistantId || user.defaultAssistantId;
    
    if (!assistantId) {
      return res.status(400).json({ 
        error: "No assistant specified. Please provide an assistantId or set a default assistant." 
      });
    }
    
    // Get the assistant from the database
    const assistant = await storage.getAssistant(assistantId);
    
    if (!assistant) {
      return res.status(404).json({ error: "Assistant not found" });
    }
    
    // Verify the assistant belongs to the user
    if (assistant.userId !== user.id) {
      return res.status(403).json({ error: "You don't have access to this assistant" });
    }
    
    // Get API key from environment - in a real app you'd use a secure vault or user credential
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }
    
    // Create OpenAI client with user's API key
    const openai = createOpenAIClient(apiKey);
    
    // Check if we need to create the OpenAI assistant
    if (!assistant.openaiAssistantId) {
      // Create a new assistant on OpenAI
      const openaiAssistant = await openai.beta.assistants.create({
        name: assistant.name,
        description: assistant.description || undefined,
        instructions: assistant.instructions || undefined,
        model: assistant.model,
        tools: [{ type: "retrieval" as any }],
      });
      
      // Update assistant with the OpenAI ID
      await storage.updateAssistant(assistant.id, {
        openaiAssistantId: openaiAssistant.id
      });
      
      assistant.openaiAssistantId = openaiAssistant.id;
    }
    
    // Get existing files for this assistant
    const existingFiles = await storage.getAssistantFiles(assistant.id);
    const existingFileIds = existingFiles.map(f => f.openaiFileId);
    
    // Process files to upload
    let toUpload: any[] = [];

    // Handle single file upload
    if (req.files?.file) {
      toUpload = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
    } 
    // Handle directory upload
    else if (req.body.dir) {
      const exts = [".jsonl", ".txt", ".csv", ".pdf", ".docx"];
      const paths = getCompatibleFiles(req.body.dir, exts);
      toUpload = paths.map((p) => ({
        name: path.basename(p),
        mv: null,
        data: fs.createReadStream(p),
      }));
    } else {
      return res.status(400).json({ error: "No file or directory provided" });
    }

    // Upload files to OpenAI and database
    const newFileIds: string[] = [];
    for (let f of toUpload) {
      try {
        const file = await openai.files.create({
          file: f.data || fs.createReadStream(f.tempFilePath || f),
          purpose: "assistants",
        });
        
        // Store file in database
        await storage.addFile(
          user.id,
          file.id,
          f.name || file.filename || "uploaded-file",
          "assistants",
          file.bytes,
          assistant.id
        );
        
        newFileIds.push(file.id);
      } catch (fileErr) {
        logger.error("Error uploading file:", fileErr);
        // Continue with other files if one fails
      }
    }

    if (newFileIds.length === 0) {
      return res.status(400).json({ error: "No files were successfully uploaded" });
    }

    // Combine existing and new file IDs
    const allFileIds = [...existingFileIds, ...newFileIds];
    
    // Update the assistant on OpenAI with the new files
    await openai.beta.assistants.update(assistant.openaiAssistantId!, {
      tools: [{ type: "retrieval" as any }],
      file_ids: allFileIds
    });
    
    // Update the database record with the file IDs
    await storage.updateAssistant(assistant.id, {
      fileIds: allFileIds
    });
    
    res.json({ 
      assistantId: assistant.id,
      fileIds: allFileIds,
      message: `Successfully uploaded ${newFileIds.length} file(s)`
    });
  } catch (err: any) {
    logger.error("Error uploading files:", err);
    res.status(500).json({ error: err.message });
  }
}
