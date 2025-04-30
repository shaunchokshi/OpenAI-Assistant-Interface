import connectPg from "connect-pg-simple";
import session from "express-session";
import { db, pool } from "./db";
import { 
  users, assistants, threads, messages, files,
  type User, type InsertUser, type Assistant, type InsertAssistant, 
  type UpdateAssistant, type Thread, type Message, type File 
} from "@shared/schema";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import { createHash } from "crypto";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserPassword(id: number, newPassword: string): Promise<void>;
  deleteUser(id: number): Promise<void>;
  updateUserOpenAIKey(userId: number, apiKeyHash: string): Promise<void>;
  updateDefaultAssistant(userId: number, assistantId: number | null): Promise<void>;
  updateResetTimestamp(userId: number): Promise<void>;
  clearResetTimestamp(userId: number): Promise<void>;
  
  // Assistant management
  createAssistant(assistant: InsertAssistant): Promise<Assistant>;
  getAssistant(id: number): Promise<Assistant | undefined>;
  getUserAssistants(userId: number): Promise<Assistant[]>;
  updateAssistant(id: number, data: UpdateAssistant): Promise<Assistant>;
  deleteAssistant(id: number): Promise<void>;
  
  // Thread management
  createThread(userId: number, assistantId: number | null, openaiThreadId: string, title?: string): Promise<Thread>;
  getThread(id: number): Promise<Thread | undefined>;
  getUserThreads(userId: number): Promise<Thread[]>;
  updateThreadTitle(id: number, title: string): Promise<void>;
  archiveThread(id: number): Promise<void>;
  deleteThread(id: number): Promise<void>;
  
  // Message management
  addMessage(threadId: number, role: string, content: string, openaiMessageId?: string): Promise<Message>;
  getThreadMessages(threadId: number): Promise<Message[]>;
  
  // File management
  addFile(
    userId: number, 
    openaiFileId: string, 
    filename: string, 
    purpose: string, 
    bytes: number,
    assistantId?: number
  ): Promise<File>;
  getUserFiles(userId: number): Promise<File[]>;
  getAssistantFiles(assistantId: number): Promise<File[]>;
  deleteFile(id: number): Promise<void>;
  
  // Session store
  sessionStore: session.Store;
}

/**
 * Hash an API key for secure storage
 * This prevents storing the raw API key in the database
 * Only a hash is stored, which can be compared later
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool: pool,
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  // User management methods
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserPassword(id: number, newPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password: newPassword,
        resetAt: new Date()
      })
      .where(eq(users.id, id));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
  
  async updateUserOpenAIKey(userId: number, apiKeyHash: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        openaiKeyHash: apiKeyHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
  
  async updateDefaultAssistant(userId: number, assistantId: number | null): Promise<void> {
    await db
      .update(users)
      .set({ 
        defaultAssistantId: assistantId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
  
  async updateResetTimestamp(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        resetAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
  
  async clearResetTimestamp(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        resetAt: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
  
  // Assistant management methods
  
  async createAssistant(assistant: InsertAssistant): Promise<Assistant> {
    const [createdAssistant] = await db
      .insert(assistants)
      .values({
        ...assistant,
        updatedAt: new Date()
      })
      .returning();
    return createdAssistant;
  }
  
  async getAssistant(id: number): Promise<Assistant | undefined> {
    const [assistant] = await db
      .select()
      .from(assistants)
      .where(eq(assistants.id, id));
    return assistant;
  }
  
  async getUserAssistants(userId: number): Promise<Assistant[]> {
    return await db
      .select()
      .from(assistants)
      .where(eq(assistants.userId, userId))
      .orderBy(asc(assistants.name));
  }
  
  async updateAssistant(id: number, data: UpdateAssistant): Promise<Assistant> {
    const [updated] = await db
      .update(assistants)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(assistants.id, id))
      .returning();
    return updated;
  }
  
  async deleteAssistant(id: number): Promise<void> {
    await db.delete(assistants).where(eq(assistants.id, id));
  }
  
  // Thread management methods
  
  async createThread(
    userId: number, 
    assistantId: number | null, 
    openaiThreadId: string, 
    title: string = "New Thread"
  ): Promise<Thread> {
    const [thread] = await db
      .insert(threads)
      .values({
        userId,
        assistantId,
        openaiThreadId,
        title,
        updatedAt: new Date()
      })
      .returning();
    return thread;
  }
  
  async getThread(id: number): Promise<Thread | undefined> {
    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, id));
    return thread;
  }
  
  async getUserThreads(userId: number): Promise<Thread[]> {
    return await db
      .select()
      .from(threads)
      .where(eq(threads.userId, userId))
      .orderBy(desc(threads.updatedAt));
  }
  
  async updateThreadTitle(id: number, title: string): Promise<void> {
    await db
      .update(threads)
      .set({ 
        title,
        updatedAt: new Date()
      })
      .where(eq(threads.id, id));
  }
  
  async archiveThread(id: number): Promise<void> {
    await db
      .update(threads)
      .set({ 
        isArchived: true,
        updatedAt: new Date()
      })
      .where(eq(threads.id, id));
  }
  
  async deleteThread(id: number): Promise<void> {
    await db.delete(threads).where(eq(threads.id, id));
  }
  
  // Message management methods
  
  async addMessage(threadId: number, role: string, content: string, openaiMessageId?: string): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        threadId,
        role,
        content,
        openaiMessageId
      })
      .returning();
    
    // Update the thread's updated_at timestamp
    await db
      .update(threads)
      .set({ updatedAt: new Date() })
      .where(eq(threads.id, threadId));
      
    return message;
  }
  
  async getThreadMessages(threadId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(asc(messages.createdAt));
  }
  
  // File management methods
  
  async addFile(
    userId: number, 
    openaiFileId: string, 
    filename: string, 
    purpose: string, 
    bytes: number,
    assistantId?: number
  ): Promise<File> {
    const [file] = await db
      .insert(files)
      .values({
        userId,
        assistantId,
        openaiFileId,
        filename,
        purpose,
        bytes
      })
      .returning();
    return file;
  }
  
  async getUserFiles(userId: number): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(eq(files.userId, userId))
      .orderBy(desc(files.createdAt));
  }
  
  async getAssistantFiles(assistantId: number): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(eq(files.assistantId, assistantId))
      .orderBy(desc(files.createdAt));
  }
  
  async deleteFile(id: number): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }
}

export const storage = new DatabaseStorage();
