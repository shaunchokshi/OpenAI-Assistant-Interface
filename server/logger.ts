import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';

// Define log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Ensure logs directory exists
const LOG_DIR = './logs';
(async () => {
  try {
    await mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating logs directory:", error);
  }
})();

// Format date for logging
function formatDate(): string {
  const now = new Date();
  return now.toISOString();
}

// Format log message
function formatMessage(level: LogLevel, message: string, meta?: any): string {
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

// Write to console and file
function log(level: LogLevel, message: string, meta?: any) {
  const formattedMessage = formatMessage(level, message, meta);
  
  // Always log to console
  switch (level) {
    case 'debug':
      if (process.env.NODE_ENV !== 'production') {
        console.debug(formattedMessage);
      }
      break;
    case 'info':
      console.info(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'error':
      console.error(formattedMessage);
      break;
  }
  
  // In production, also log to file
  if (process.env.NODE_ENV === 'production') {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const logFile = path.join(LOG_DIR, `app-${today}.log`);
      fs.appendFileSync(logFile, formattedMessage + '\n');
    } catch (err) {
      console.error(`Failed to write to log file: ${err}`);
    }
  }
}

// Logger interface
export const logger = {
  debug: (message: string, meta?: any) => log('debug', message, meta),
  info: (message: string, meta?: any) => log('info', message, meta),
  warn: (message: string, meta?: any) => log('warn', message, meta),
  error: (message: string, meta?: any) => log('error', message, meta),
};

// Log express request for API calls
export function logRequest(method: string, path: string, statusCode: number, duration: number, responseData?: any) {
  const logData: Record<string, any> = {
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
  };
  
  // Only include response data in development
  if (process.env.NODE_ENV !== 'production' && responseData) {
    logData.response = responseData;
  }
  
  const level: LogLevel = statusCode >= 400 ? 'error' : 'info';
  logger[level](`${method} ${path} ${statusCode} in ${duration}ms`, logData);
}