import OpenAI from "openai";
import { mkdir, readFile, writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { Request, Response } from "express";

const ASSISTANT_ID = process.env.ASSISTANT_ID || "asst_LeAZHFv3z9giuBVjuB2d1V85";
const THREADS_DIR = "./threads";
const LOG_DIR = "./logs";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ensure required directories exist
(async () => {
  try {
    await mkdir(THREADS_DIR, { recursive: true });
    await mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating required directories:", error);
  }
})();

// Remove duplicate directory creation

// Log messages to file
async function logMessage(role: string, text: string) {
  try {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${role.toUpperCase()}: ${text}\n`;
    const logFile = `${LOG_DIR}/chat-${timestamp.slice(0, 10)}.log`;
    await writeFile(logFile, line, { flag: "a" });
  } catch (error) {
    console.error("Error logging message:", error);
  }
}

// Initialize or get a thread for a user
export async function initThread(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userId = req.user.id;
    const userThreadFile = path.join(THREADS_DIR, `user_${userId}_thread.json`);
    
    let threadId: string;
    try {
      // Try to get an existing thread for this user
      const data = await readFile(userThreadFile, "utf8");
      threadId = JSON.parse(data).threadId;
    } catch {
      // Create a new thread if none exists
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      await writeFile(userThreadFile, JSON.stringify({ threadId }, null, 2));
    }
    
    res.json({ threadId });
  } catch (err: any) {
    console.error("Error initializing thread:", err);
    res.status(500).json({ error: err.message });
  }
}

// Chat with assistant
export async function chatWithAssistant(req: Request, res: Response) {
  try {
    const { threadId, message } = req.body;
    
    if (!threadId || !message) {
      return res.status(400).json({ error: "Thread ID and message are required" });
    }
    
    await logMessage("user", message);

    // Post user message to thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
    });

    // Poll until complete
    let status = await openai.beta.threads.runs.retrieve(threadId, run.id);
    while (status.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await openai.beta.threads.runs.retrieve(threadId, run.id);
      
      if (["failed", "cancelled", "expired"].includes(status.status)) {
        return res.status(500).json({ status: status.status });
      }
    }

    // Get assistant response
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMsg = messages.data
      .filter((m) => m.run_id === run.id && m.role === "assistant")
      .pop();

    if (assistantMsg?.content[0]?.type === "text") {
      const text = assistantMsg.content[0].text.value;
      await logMessage("assistant", text);
      res.json({ text });
    } else {
      res.status(500).json({ error: "Unexpected response format from OpenAI" });
    }
  } catch (err: any) {
    console.error("Error chatting with assistant:", err);
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
    console.error(`Error reading directory ${dir}:`, error);
  }
  return out;
}

// Upload files to assistant
export async function uploadFiles(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Get the assistant ID from user or use default
    const assistantId = req.user.assistantId || ASSISTANT_ID;
    
    // Retrieve existing file IDs
    const assistant = await openai.beta.assistants.retrieve(assistantId);
    const existing = assistant.file_ids || [];
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

    // Upload files to OpenAI
    const newIds: string[] = [];
    for (let f of toUpload) {
      try {
        const file = await openai.files.create({
          file: f.data || fs.createReadStream(f.tempFilePath || f),
          purpose: "assistants",
        });
        newIds.push(file.id);
      } catch (fileErr) {
        console.error("Error uploading file:", fileErr);
        // Continue with other files if one fails
      }
    }

    if (newIds.length === 0) {
      return res.status(400).json({ error: "No files were successfully uploaded" });
    }

    // Update assistant with new file IDs
    const fileIds = [...existing, ...newIds];
    await openai.beta.assistants.update(assistantId, {
      tools: [{ type: "retrieval" as any }],
      file_ids: fileIds as any
    });
    
    res.json({ 
      file_ids: fileIds,
      message: `Successfully uploaded ${newIds.length} file(s)`
    });
  } catch (err: any) {
    console.error("Error uploading files:", err);
    res.status(500).json({ error: err.message });
  }
}
