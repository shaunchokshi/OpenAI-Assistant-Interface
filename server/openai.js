// openai.js
import fsPromises from "fs/promises";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = "asst_LeAZHFv3z9giuBVjuB2d1V85";
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
    res.status(500).json({ error: err.message });
  }
}

export async function chatWithAssistant(req, res) {
  try {
    const { threadId, message } = req.body;
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
    while (status.status !== "completed") {
      await new Promise((r) => setTimeout(r, 1000));
      status = await openai.beta.threads.runs.retrieve(threadId, run.id);
      if (["failed", "cancelled", "expired"].includes(status.status)) {
        return res.status(500).json({ status: status.status });
      }
    }

    const msgs = await openai.beta.threads.messages.list(threadId);
    const assistantMsg = msgs.data
      .filter((m) => m.run_id === run.id && m.role === "assistant")
      .pop();

    const text = assistantMsg?.content[0].text.value || "";
    await logMessage("assistant", text);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

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

    // single file vs directory
    if (req.files?.file) {
      toUpload = [req.files.file];
    } else if (req.body.dir) {
      const exts = [".jsonl", ".txt", ".csv", ".pdf", ".docx"];
      const paths = getCompatibleFiles(req.body.dir, exts);
      toUpload = paths.map((p) => ({ name: path.basename(p), mv: null, data: fs.createReadStream(p) }));
    } else {
      return res.status(400).json({ error: "No file or dir provided" });
    }

    const newIds = [];
    for (let f of toUpload) {
      const file = await openai.files.create({
        file: f.data || fs.createReadStream(f.tempFilePath || f),
        purpose: "assistants",
      });
      newIds.push(file.id);
    }

    const allIds = [...new Set([...existing, ...newIds])];
    await openai.beta.assistants.update(ASSISTANT_ID, { file_ids: allIds });
    res.json({ file_ids: allIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
