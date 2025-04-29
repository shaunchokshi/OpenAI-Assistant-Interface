import OpenAI from "openai";
import { mkdir, readFile, writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { Request, Response } from "express";

const ASSISTANT_ID = process.env.ASSISTANT_ID || "asst_LeAZHFv3z9giuBVjuB2d1V85";
const THREAD_FILE = "./thread.json";
const LOG_DIR = "./logs";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ensure logs directory exists
(async () => {
  try {
    await mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating logs directory:", error);
  }
})();

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

// Initialize thread
export async function initThread(req: Request, res: Response) {
  try {
    let threadId: string;
    try {
      const data = await readFile(THREAD_FILE, "utf8");
      threadId = JSON.parse(data).threadId;
    } catch {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      await writeFile(THREAD_FILE, JSON.stringify({ threadId }, null, 2));
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
    // Retrieve existing file IDs
    const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
    const existing = assistant.file_ids || [];
    let toUpload: any[] = [];

    // Handle single file upload
    if (req.files?.file) {
      toUpload = [req.files.file];
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
      const file = await openai.files.create({
        file: f.data || fs.createReadStream(f.tempFilePath || f),
        purpose: "assistants",
      });
      newIds.push(file.id);
    }

    // Update assistant with new file IDs
    const allIds = [...new Set([...existing, ...newIds])];
    await openai.beta.assistants.update(ASSISTANT_ID, { file_ids: allIds });
    
    res.json({ file_ids: allIds });
  } catch (err: any) {
    console.error("Error uploading files:", err);
    res.status(500).json({ error: err.message });
  }
}
