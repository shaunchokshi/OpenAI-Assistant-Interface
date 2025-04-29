import { promises as fsPromises } from "fs";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Make this configurable through environment or database
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || "asst_LeAZHFv3z9giuBVjuB2d1V85"; 
const THREAD_FILE = "./thread.json";
const LOG_DIR = "./logs";

// ensure logs dir exists
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

async function logMessage(role, text) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${role.toUpperCase()}: ${text}\n`;
  const logFile = `${LOG_DIR}/chat-${timestamp.slice(0, 10)}.log`;
  await fsPromises.appendFile(logFile, line);
}

export async function initThread(req, res) {
  try {
    let threadId;
    try {
      const data = await fsPromises.readFile(THREAD_FILE, "utf8");
      threadId = JSON.parse(data).threadId;
    } catch {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      await fsPromises.writeFile(THREAD_FILE, JSON.stringify({ threadId }, null, 2));
    }
    res.json({ threadId });
  } catch (err) {
    console.error("Thread initialization error:", err);
    res.status(500).json({ error: "Failed to initialize thread", details: err.message });
  }
}

export async function chatWithAssistant(req, res) {
  try {
    const { threadId, message } = req.body;
    
    if (!threadId || !message) {
      return res.status(400).json({ error: "Thread ID and message are required" });
    }
    
    await logMessage("user", message);

    // post user message
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
    });

    // poll until complete
    let status = await openai.beta.threads.runs.retrieve(threadId, run.id);
    let attempts = 0;
    const maxAttempts = 30; // Prevent infinite loops
    
    while (status.status !== "completed" && attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1000));
      status = await openai.beta.threads.runs.retrieve(threadId, run.id);
      attempts++;
      
      if (["failed", "cancelled", "expired"].includes(status.status)) {
        return res.status(500).json({ 
          status: status.status,
          error: "Assistant run failed to complete", 
          details: status.last_error || "Unknown error" 
        });
      }
    }
    
    if (attempts >= maxAttempts) {
      return res.status(504).json({ error: "Request timed out" });
    }

    const msgs = await openai.beta.threads.messages.list(threadId);
    const assistantMsg = msgs.data
      .filter((m) => m.run_id === run.id && m.role === "assistant")
      .pop();

    if (!assistantMsg) {
      return res.status(404).json({ error: "No assistant response found" });
    }

    const text = assistantMsg?.content[0].text.value || "";
    await logMessage("assistant", text);
    res.json({ text });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to communicate with OpenAI", details: err.message });
  }
}

// Improved file validation
const VALID_EXTENSIONS = [".jsonl", ".txt", ".csv", ".pdf", ".docx"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit

function getCompatibleFiles(dir, exts) {
  let out = [];
  for (let name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) out.push(...getCompatibleFiles(full, exts));
    else if (exts.includes(path.extname(name.name).toLowerCase())) out.push(full);
  }
  return out;
}

export async function uploadFiles(req, res) {
  try {
    const existing = (await openai.beta.assistants.retrieve(ASSISTANT_ID)).file_ids || [];
    let toUpload = [];

    // single file case
    if (req.files?.file) {
      const file = req.files.file;
      
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` });
      }
      
      // Validate file extension
      const ext = path.extname(file.name).toLowerCase();
      if (!VALID_EXTENSIONS.includes(ext)) {
        return res.status(400).json({ 
          error: `Invalid file type. Allowed: ${VALID_EXTENSIONS.join(', ')}` 
        });
      }
      
      toUpload = [file];
    } 
    // directory case
    else if (req.body.dir) {
      // Validate directory exists
      if (!fs.existsSync(req.body.dir)) {
        return res.status(400).json({ error: "Directory not found" });
      }
      
      const paths = getCompatibleFiles(req.body.dir, VALID_EXTENSIONS);
      
      if (paths.length === 0) {
        return res.status(400).json({ error: "No compatible files found in directory" });
      }
      
      toUpload = paths.map((p) => ({ 
        name: path.basename(p), 
        mv: null, 
        data: fs.createReadStream(p) 
      }));
    } 
    else {
      return res.status(400).json({ error: "No file or directory provided" });
    }

    const newIds = [];
    const errors = [];
    
    for (let f of toUpload) {
      try {
        const file = await openai.files.create({
          file: f.data || fs.createReadStream(f.tempFilePath || f),
          purpose: "assistants",
        });
        newIds.push(file.id);
      } catch (err) {
        errors.push({ file: f.name, error: err.message });
      }
    }

    if (newIds.length === 0 && errors.length > 0) {
      return res.status(500).json({ 
        error: "All file uploads failed", 
        details: errors 
      });
    }

    const allIds = [...new Set([...existing, ...newIds])];
    await openai.beta.assistants.update(ASSISTANT_ID, { file_ids: allIds });
    
    res.json({ 
      file_ids: allIds,
      uploaded: newIds.length,
      failed: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ error: "File upload failed", details: err.message });
  }
}