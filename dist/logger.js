// server/logger.ts
import fs from "fs";
import path from "path";
import { mkdir } from "fs/promises";
var LOG_DIR = "./logs";
(async () => {
  try {
    await mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating logs directory:", error);
  }
})();
function formatDate() {
  const now = /* @__PURE__ */ new Date();
  return now.toISOString();
}
function formatMessage(level, message, meta) {
  const timestamp = formatDate();
  let logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  if (meta) {
    try {
      logLine += ` ${JSON.stringify(meta)}`;
    } catch (err) {
      logLine += ` [Error serializing meta data]`;
    }
  }
  return logLine;
}
function log(level, message, meta) {
  const formattedMessage = formatMessage(level, message, meta);
  switch (level) {
    case "debug":
      if (process.env.NODE_ENV !== "production") {
        console.debug(formattedMessage);
      }
      break;
    case "info":
      console.info(formattedMessage);
      break;
    case "warn":
      console.warn(formattedMessage);
      break;
    case "error":
      console.error(formattedMessage);
      break;
  }
  if (process.env.NODE_ENV === "production") {
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const logFile = path.join(LOG_DIR, `app-${today}.log`);
      fs.appendFileSync(logFile, formattedMessage + "\n");
    } catch (err) {
      console.error(`Failed to write to log file: ${err}`);
    }
  }
}
var logger = {
  debug: (message, meta) => log("debug", message, meta),
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta)
};
function logRequest(method, path2, statusCode, duration, responseData) {
  const logData = {
    method,
    path: path2,
    statusCode,
    duration: `${duration}ms`
  };
  if (process.env.NODE_ENV !== "production" && responseData) {
    logData.response = responseData;
  }
  const level = statusCode >= 400 ? "error" : "info";
  logger[level](`${method} ${path2} ${statusCode} in ${duration}ms`, logData);
}
export {
  logRequest,
  logger
};
