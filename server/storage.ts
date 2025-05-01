import connectPg from "connect-pg-simple";
import session from "express-session";
import { db, pool } from "./db";
import { 
  users, assistants, threads, messages, files, oauthProfiles, userSessions, usageAnalytics, userPreferences,
  fineTuningJobs, fineTunedModels,
  type User, type InsertUser, type Assistant, type InsertAssistant, 
  type UpdateAssistant, type Thread, type Message, type File,
  type OAuthProfile, type UserSession, type UsageAnalytic, type InsertUsageAnalytic,
  type UserPreferences, type InsertUserPreferences, type UpdateUserPreferences,
  type FineTuningJob, type InsertFineTuningJob, type UpdateFineTuningJob, 
  type FineTunedModel, type InsertFineTunedModel
} from "@shared/schema";
import { eq, and, desc, sql, asc, lte, gte } from "drizzle-orm";
import { createHash } from "crypto";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createUserWithOAuth(email: string, name?: string, picture?: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserPassword(id: number, newPassword: string): Promise<void>;
  deleteUser(id: number): Promise<void>;
  updateUserOpenAIKey(userId: number, apiKeyHash: string): Promise<void>;
  updateDefaultAssistant(userId: number, assistantId: number | null): Promise<void>;
  updateResetTimestamp(userId: number): Promise<void>;
  clearResetTimestamp(userId: number): Promise<void>;
  
  // OAuth management
  findOrCreateOAuthProfile(
    provider: string,
    providerUserId: string,
    userId: number,
    accessToken?: string,
    refreshToken?: string
  ): Promise<OAuthProfile>;
  getOAuthProfileByProviderAndId(provider: string, providerUserId: string): Promise<OAuthProfile | undefined>;
  getOAuthProfilesForUser(userId: number): Promise<OAuthProfile[]>;
  
  // Session management
  createUserSession(
    userId: number,
    sessionId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<UserSession>;
  getUserSessions(userId: number): Promise<UserSession[]>;
  terminateUserSession(id: number): Promise<void>;
  terminateAllUserSessions(userId: number, exceptSessionId?: string): Promise<void>;
  updateUserSessionActivity(sessionId: string): Promise<void>;
  
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
  
  // User Preferences management
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: number, preferences: UpdateUserPreferences): Promise<UserPreferences>;
  
  // Usage Analytics
  trackUsage(usageData: InsertUsageAnalytic): Promise<UsageAnalytic>;
  getUserUsageAnalytics(userId: number, options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<UsageAnalytic[]>;
  getUserUsageSummary(userId: number, options?: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    periodSummaries: Array<{
      period: string;
      requests: number;
      tokens: number;
      cost: number;
      models: Record<string, {
        tokens: number;
        cost: number;
      }>;
    }>;
  }>;
  
  // Fine-tuning management
  createFineTuningJob(jobData: InsertFineTuningJob): Promise<FineTuningJob>;
  getFineTuningJob(id: number): Promise<FineTuningJob | undefined>;
  getFineTuningJobByOpenAIId(openaiJobId: string): Promise<FineTuningJob | undefined>;
  getUserFineTuningJobs(userId: number): Promise<FineTuningJob[]>;
  updateFineTuningJob(id: number, data: UpdateFineTuningJob): Promise<FineTuningJob>;
  deleteFineTuningJob(id: number): Promise<void>;
  
  // Fine-tuned models management
  createFineTunedModel(modelData: InsertFineTunedModel): Promise<FineTunedModel>;
  getFineTunedModel(id: number): Promise<FineTunedModel | undefined>;
  getUserFineTunedModels(userId: number): Promise<FineTunedModel[]>;
  updateFineTunedModelStatus(id: number, isActive: boolean): Promise<void>;
  deleteFineTunedModel(id: number): Promise<void>;

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

  async createUserWithOAuth(email: string, name?: string, picture?: string): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email,
        name,
        picture,
        // No password for OAuth users
      })
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
  
  // OAuth management methods
  
  async findOrCreateOAuthProfile(
    provider: string,
    providerUserId: string,
    userId: number,
    accessToken?: string,
    refreshToken?: string
  ): Promise<OAuthProfile> {
    // Check if profile already exists
    const [existingProfile] = await db
      .select()
      .from(oauthProfiles)
      .where(
        and(
          eq(oauthProfiles.provider, provider),
          eq(oauthProfiles.providerUserId, providerUserId)
        )
      );
    
    if (existingProfile) {
      // Update tokens if provided
      if (accessToken || refreshToken) {
        const updateData: any = {};
        if (accessToken) updateData.accessToken = accessToken;
        if (refreshToken) updateData.refreshToken = refreshToken;
        
        const [updated] = await db
          .update(oauthProfiles)
          .set(updateData)
          .where(eq(oauthProfiles.id, existingProfile.id))
          .returning();
        
        return updated;
      }
      
      return existingProfile;
    }
    
    // Create new profile
    const [profile] = await db
      .insert(oauthProfiles)
      .values({
        provider,
        providerUserId,
        userId,
        accessToken,
        refreshToken
      })
      .returning();
    
    return profile;
  }
  
  async getOAuthProfileByProviderAndId(provider: string, providerUserId: string): Promise<OAuthProfile | undefined> {
    const [profile] = await db
      .select()
      .from(oauthProfiles)
      .where(
        and(
          eq(oauthProfiles.provider, provider),
          eq(oauthProfiles.providerUserId, providerUserId)
        )
      );
    
    return profile;
  }
  
  async getOAuthProfilesForUser(userId: number): Promise<OAuthProfile[]> {
    return await db
      .select()
      .from(oauthProfiles)
      .where(eq(oauthProfiles.userId, userId));
  }
  
  // Session management methods
  
  async createUserSession(
    userId: number,
    sessionId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<UserSession> {
    const [session] = await db
      .insert(userSessions)
      .values({
        userId,
        sessionId,
        userAgent,
        ipAddress
      })
      .returning();
    
    return session;
  }
  
  async getUserSessions(userId: number): Promise<UserSession[]> {
    return await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true)
        )
      )
      .orderBy(desc(userSessions.lastActive));
  }
  
  async terminateUserSession(id: number): Promise<void> {
    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.id, id));
  }
  
  async terminateAllUserSessions(userId: number, exceptSessionId?: string): Promise<void> {
    let conditions = and(
      eq(userSessions.userId, userId),
      eq(userSessions.isActive, true)
    );
    
    if (exceptSessionId) {
      conditions = and(
        conditions,
        sql`${userSessions.sessionId} != ${exceptSessionId}`
      );
    }
    
    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(conditions);
  }
  
  async updateUserSessionActivity(sessionId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ lastActive: new Date() })
      .where(eq(userSessions.sessionId, sessionId));
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
  
  // User Preferences methods
  
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    
    return preferences;
  }
  
  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [newPreferences] = await db
      .insert(userPreferences)
      .values(preferences)
      .returning();
    
    return newPreferences;
  }
  
  async updateUserPreferences(userId: number, preferences: UpdateUserPreferences): Promise<UserPreferences> {
    const [updated] = await db
      .update(userPreferences)
      .set({
        ...preferences,
        updatedAt: new Date()
      })
      .where(eq(userPreferences.userId, userId))
      .returning();
    
    if (!updated) {
      // If no preferences exist for this user, create them
      return this.createUserPreferences({
        userId,
        ...preferences
      });
    }
    
    return updated;
  }

  // Usage Analytics methods
  
  async trackUsage(usageData: InsertUsageAnalytic): Promise<UsageAnalytic> {
    const [record] = await db
      .insert(usageAnalytics)
      .values(usageData)
      .returning();
    return record;
  }
  
  async getUserUsageAnalytics(userId: number, options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<UsageAnalytic[]> {
    // Start with base conditions
    let conditions = eq(usageAnalytics.userId, userId);
    
    if (options?.startDate) {
      conditions = and(
        conditions,
        gte(usageAnalytics.createdAt, options.startDate)
      );
    }
    
    if (options?.endDate) {
      conditions = and(
        conditions,
        lte(usageAnalytics.createdAt, options.endDate)
      );
    }
    
    // Build query with all options
    const query = db
      .select()
      .from(usageAnalytics)
      .where(conditions)
      .orderBy(desc(usageAnalytics.createdAt));
    
    // Apply pagination if provided
    if (options?.limit) {
      return await query.limit(options.limit).offset(options?.offset || 0);
    }
    
    return await query;
  }
  
  async getUserUsageSummary(userId: number, options?: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    periodSummaries: Array<{
      period: string;
      requests: number;
      tokens: number;
      cost: number;
      models: Record<string, {
        tokens: number;
        cost: number;
      }>;
    }>;
  }> {
    // Build query conditions
    let conditions = eq(usageAnalytics.userId, userId);
    
    if (options?.startDate) {
      conditions = and(
        conditions,
        gte(usageAnalytics.createdAt, options.startDate)
      );
    }
    
    if (options?.endDate) {
      conditions = and(
        conditions,
        lte(usageAnalytics.createdAt, options.endDate)
      );
    }
    
    // Get all analytics records for the time period
    const records = await db
      .select()
      .from(usageAnalytics)
      .where(conditions)
      .orderBy(asc(usageAnalytics.createdAt));
    
    // Calculate totals
    const totalRequests = records.length;
    const totalTokens = records.reduce((sum, record) => sum + record.totalTokens, 0);
    const totalCost = records.reduce((sum, record) => sum + record.estimatedCost, 0);
    
    // Group by period
    const periodFormat = options?.groupBy || 'day';
    const periodSummaries: Array<{
      period: string;
      requests: number;
      tokens: number;
      cost: number;
      models: Record<string, {
        tokens: number;
        cost: number;
      }>;
    }> = [];
    
    // Group records by period
    const groupedRecords: Record<string, UsageAnalytic[]> = {};
    
    for (const record of records) {
      const date = new Date(record.createdAt);
      let periodKey: string;
      
      if (periodFormat === 'day') {
        periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (periodFormat === 'week') {
        // Get the first day of the week (Sunday)
        const day = date.getDay();
        const diff = date.getDate() - day;
        const firstDayOfWeek = new Date(date);
        firstDayOfWeek.setDate(diff);
        periodKey = firstDayOfWeek.toISOString().split('T')[0];
      } else if (periodFormat === 'month') {
        periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      } else {
        periodKey = date.toISOString().split('T')[0]; // Default to day
      }
      
      if (!groupedRecords[periodKey]) {
        groupedRecords[periodKey] = [];
      }
      
      groupedRecords[periodKey].push(record);
    }
    
    // Calculate summaries for each period
    for (const [period, periodRecords] of Object.entries(groupedRecords)) {
      const periodRequests = periodRecords.length;
      const periodTokens = periodRecords.reduce((sum, record) => sum + record.totalTokens, 0);
      const periodCost = periodRecords.reduce((sum, record) => sum + record.estimatedCost, 0);
      
      // Group by model
      const models: Record<string, {
        tokens: number;
        cost: number;
      }> = {};
      
      for (const record of periodRecords) {
        if (!models[record.modelId]) {
          models[record.modelId] = {
            tokens: 0,
            cost: 0
          };
        }
        
        models[record.modelId].tokens += record.totalTokens;
        models[record.modelId].cost += record.estimatedCost;
      }
      
      periodSummaries.push({
        period,
        requests: periodRequests,
        tokens: periodTokens,
        cost: periodCost,
        models
      });
    }
    
    // Sort periods chronologically
    periodSummaries.sort((a, b) => a.period.localeCompare(b.period));
    
    return {
      totalRequests,
      totalTokens,
      totalCost,
      periodSummaries
    };
  }
}

export const storage = new DatabaseStorage();
