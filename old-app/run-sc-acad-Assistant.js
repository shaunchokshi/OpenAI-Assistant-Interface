// run-sc-acad-Assistant.js
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';

dotenv.config();

// Create readline interface
const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Fixed assistant
const assistantId = "asst_LeAZHFv3z9giuBVjuB2d1V85";
const assistantName = "sc-academic.5.6";

// Log directory setup
const logDir = "./logs";
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Helper: Ask question
async function askQuestion(question) {
  return new Promise((resolve) => readline.question(question, resolve));
}

// Helper: Log interactions
async function logMessage(role, message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${role.toUpperCase()}: ${message}\n`;
  const logFile = `${logDir}/chat-${timestamp.slice(0, 10)}.log`;
  await fsPromises.appendFile(logFile, logLine);
}

// Helper: Get or create persistent thread
async function getThread() {
  const threadFile = "./thread.json";
  try {
    const data = await fsPromises.readFile(threadFile, "utf8");
    const { threadId } = JSON.parse(data);
    console.log("Resuming existing conversation thread.\n");
    return threadId;
  } catch {
    const thread = await openai.beta.threads.create();
    await fsPromises.writeFile(threadFile, JSON.stringify({ threadId: thread.id }, null, 2));
    console.log("Created new conversation thread.\n");
    return thread.id;
  }
}

// Helper: Recursively get compatible files
function getCompatibleFiles(dir, allowedExtensions) {
  let filesToUpload = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (let entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      filesToUpload = filesToUpload.concat(getCompatibleFiles(fullPath, allowedExtensions));
    } else if (allowedExtensions.includes(path.extname(entry.name).toLowerCase())) {
      filesToUpload.push(fullPath);
    }
  }
  return filesToUpload;
}

async function main() {
  try {
    console.log(`\nConnected to assistant "${assistantName}".\n`);

    const threadId = await getThread();

    let keepAsking = true;
    while (keepAsking) {
      const action = await askQuestion(
        "Select action:\n1. Chat with assistant\n2. Upload single file\n3. Upload all compatible files in directory\nEnter choice (1/2/3): "
      );

      if (action === "2") {
        const fileName = await askQuestion("Enter filename to upload: ");
        if (!fs.existsSync(fileName)) {
          console.log("File does not exist.\n");
        } else {
          const file = await openai.files.create({
            file: fs.createReadStream(fileName),
            purpose: "assistants",
          });

          const assistant = await openai.beta.assistants.retrieve(assistantId);
          const updatedFileIds = [...(assistant.file_ids || []), file.id];

          await openai.beta.assistants.update(assistantId, { file_ids: updatedFileIds });
          console.log("File uploaded and linked to assistant.\n");
        }
      }

      if (action === "3") {
        const dirPath = await askQuestion("Enter directory path: ");
        const allowedExtensions = [".jsonl", ".txt", ".csv", ".pdf", ".docx"];
        const files = getCompatibleFiles(dirPath, allowedExtensions);

        if (files.length === 0) {
          console.log("No compatible files found.\n");
        } else {
          console.log(`Found ${files.length} compatible files. Uploading...`);
          const uploadedFileIds = [];

          for (let filePath of files) {
            const file = await openai.files.create({
              file: fs.createReadStream(filePath),
              purpose: "assistants",
            });
            uploadedFileIds.push(file.id);
          }

          const assistant = await openai.beta.assistants.retrieve(assistantId);
          const updatedFileIds = [...(assistant.file_ids || []), ...uploadedFileIds];

          await openai.beta.assistants.update(assistantId, { file_ids: updatedFileIds });
          console.log("All files uploaded and linked to assistant.\n");
        }
      }

      if (action === "1") {
        let continueChat = true;
        while (continueChat) {
          const userQuestion = await askQuestion("\nYour question: ");
          await logMessage("user", userQuestion);

          await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: userQuestion,
          });

          const run = await openai.beta.threads.runs.create(threadId, { assistant_id: assistantId });

          let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
          while (runStatus.status !== "completed") {
            await new Promise((r) => setTimeout(r, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
            if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
              console.log(`Run ${runStatus.status}. Request failed.`);
              break;
            }
          }

          const messages = await openai.beta.threads.messages.list(threadId);
          const lastMessage = messages.data.filter(
            (m) => m.run_id === run.id && m.role === "assistant"
          ).pop();

          if (lastMessage) {
            const response = lastMessage.content[0].text.value;
            console.log(`${response}\n`);
            await logMessage("assistant", response);
          } else {
            console.log("No response received.\n");
          }

          const continueChatAnswer = await askQuestion("Ask another question? (yes/no) ");
          continueChat = ["yes", "y"].includes(continueChatAnswer.toLowerCase());
        }
      }

      const continueOverall = await askQuestion("Perform another action? (yes/no) ");
      keepAsking = ["yes", "y"].includes(continueOverall.toLowerCase());

      if (!keepAsking) console.log("Goodbye!\n");
    }

    readline.close();
  } catch (err) {
    console.error(err);
    readline.close();
  }
}

main();