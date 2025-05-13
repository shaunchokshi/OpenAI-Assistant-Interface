var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/openai.ts
import OpenAI from "openai";
import { mkdir as mkdir2, writeFile } from "fs/promises";
import fs2 from "fs";
import path2 from "path";

// server/storage.ts
import connectPg from "connect-pg-simple";
import session from "express-session";

// server/db.ts
import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  apiKeySchema: () => apiKeySchema,
  assistantSchema: () => assistantSchema,
  assistants: () => assistants,
  files: () => files,
  fineTunedModelSchema: () => fineTunedModelSchema,
  fineTunedModels: () => fineTunedModels,
  fineTuningJobSchema: () => fineTuningJobSchema,
  fineTuningJobs: () => fineTuningJobs,
  insertUserSchema: () => insertUserSchema,
  loginUserSchema: () => loginUserSchema,
  messages: () => messages,
  oauthProfiles: () => oauthProfiles,
  requestPasswordResetSchema: () => requestPasswordResetSchema,
  resetPasswordSchema: () => resetPasswordSchema,
  sessions: () => sessions,
  threads: () => threads,
  updateAssistantSchema: () => updateAssistantSchema,
  updateFineTuningJobSchema: () => updateFineTuningJobSchema,
  updateUserPreferencesSchema: () => updateUserPreferencesSchema,
  usageAnalytics: () => usageAnalytics,
  usageAnalyticsSchema: () => usageAnalyticsSchema,
  userPreferences: () => userPreferences,
  userPreferencesSchema: () => userPreferencesSchema,
  userSessions: () => userSessions,
  users: () => users
});
import { pgTable, text, serial, timestamp, varchar, boolean, integer, json, uniqueIndex, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password"),
  // Can be null for social login users
  name: varchar("name", { length: 255 }),
  picture: varchar("picture", { length: 1024 }),
  role: varchar("role", { length: 50 }).default("user"),
  // Possible values: user, admin, editor
  openaiKeyHash: varchar("openai_key_hash", { length: 255 }),
  defaultAssistantId: integer("default_assistant_id"),
  resetAt: timestamp("reset_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var assistants = pgTable("assistants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  openaiAssistantId: varchar("openai_assistant_id", { length: 100 }),
  model: varchar("model", { length: 50 }).notNull().default("gpt-4o"),
  instructions: text("instructions"),
  temperature: doublePrecision("temperature").default(0.7),
  fileIds: text("file_ids").array(),
  tools: json("tools"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => {
  return {
    userIdNameIndex: uniqueIndex("user_id_name_idx").on(table.userId, table.name)
  };
});
var threads = pgTable("threads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assistantId: integer("assistant_id").references(() => assistants.id, { onDelete: "set null" }),
  openaiThreadId: varchar("openai_thread_id", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).default("New Thread"),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  openaiMessageId: varchar("openai_message_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow()
});
var files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assistantId: integer("assistant_id").references(() => assistants.id, { onDelete: "set null" }),
  openaiFileId: varchar("openai_file_id", { length: 100 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  purpose: varchar("purpose", { length: 50 }).notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var oauthProfiles = pgTable("oauth_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(),
  providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  createdAt: timestamp("created_at").defaultNow()
});
var sessions = pgTable("session", {
  sid: varchar("sid", { length: 255 }).notNull().primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull()
});
var userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 255 }).notNull().references(() => sessions.sid, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  lastActive: timestamp("last_active").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var usageAnalytics = pgTable("usage_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assistantId: integer("assistant_id").references(() => assistants.id, { onDelete: "set null" }),
  threadId: integer("thread_id").references(() => threads.id, { onDelete: "set null" }),
  modelId: varchar("model_id", { length: 50 }).notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedCost: doublePrecision("estimated_cost").notNull().default(0),
  requestType: varchar("request_type", { length: 50 }).notNull().default("chat"),
  // chat, completion, embedding, etc.
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});
var fineTuningJobs = pgTable("fine_tuning_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  openaiJobId: varchar("openai_job_id", { length: 100 }),
  name: varchar("name", { length: 100 }).notNull(),
  baseModel: varchar("base_model", { length: 50 }).notNull(),
  trainingFileId: integer("training_file_id").references(() => files.id),
  validationFileId: integer("validation_file_id").references(() => files.id),
  fineTunedModelName: varchar("fine_tuned_model_name", { length: 100 }),
  hyperparameters: json("hyperparameters"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  // pending, running, succeeded, failed, cancelled
  trainedTokens: integer("trained_tokens"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var fineTunedModels = pgTable("fine_tuned_models", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: integer("job_id").references(() => fineTuningJobs.id, { onDelete: "set null" }),
  openaiModelId: varchar("openai_model_id", { length: 100 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  baseModel: varchar("base_model", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true)
});
var userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  theme: varchar("theme", { length: 50 }).default("dark"),
  // light, dark, system
  customColors: boolean("custom_colors").default(false),
  backgroundColor: varchar("background_color", { length: 50 }),
  foregroundColor: varchar("foreground_color", { length: 50 }),
  primaryColor: varchar("primary_color", { length: 50 }),
  accentColor: varchar("accent_color", { length: 50 }),
  cardColor: varchar("card_color", { length: 50 }),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  soundEnabled: boolean("sound_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  picture: true
}).partial({
  password: true,
  name: true,
  picture: true
});
var loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string()
});
var requestPasswordResetSchema = z.object({
  email: z.string().email()
});
var resetPasswordSchema = z.object({
  userId: z.number().int().positive("Invalid user ID"),
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
});
var assistantSchema = createInsertSchema(assistants, {
  id: void 0,
  createdAt: void 0,
  updatedAt: void 0
});
var updateAssistantSchema = assistantSchema.partial();
var apiKeySchema = z.object({
  apiKey: z.string().min(1, "API Key is required")
});
var usageAnalyticsSchema = createInsertSchema(usageAnalytics, {
  id: void 0,
  createdAt: void 0
});
var userPreferencesSchema = createInsertSchema(userPreferences, {
  id: void 0,
  createdAt: void 0,
  updatedAt: void 0
});
var updateUserPreferencesSchema = userPreferencesSchema.partial().omit({ userId: true });
var fineTuningJobSchema = createInsertSchema(fineTuningJobs, {
  id: void 0,
  openaiJobId: void 0,
  status: void 0,
  trainedTokens: void 0,
  error: void 0,
  createdAt: void 0,
  updatedAt: void 0,
  fineTunedModelName: void 0
});
var updateFineTuningJobSchema = fineTuningJobSchema.partial();
var fineTunedModelSchema = createInsertSchema(fineTunedModels, {
  id: void 0,
  createdAt: void 0
});

// server/db.ts
var { Pool } = pkg;
if (!process.env.DATABASE_URL) {
  if (process.env.PG_HOST && process.env.PG_DB && process.env.PG_USER && process.env.PG_PASSWORD) {
    process.env.DATABASE_URL = `postgres://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOST}:${process.env.PG_PORT || 5432}/${process.env.PG_DB}`;
  } else {
    throw new Error(
      "DATABASE_URL or PG_* environment variables must be set"
    );
  }
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Set a reasonable connection timeout
  connectionTimeoutMillis: 5e3
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and, desc, sql, asc, lte, gte } from "drizzle-orm";
var PostgresSessionStore = connectPg(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: "session"
    });
  }
  // User management methods
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async createUserWithOAuth(email, name, picture) {
    const [user] = await db.insert(users).values({
      email,
      name,
      picture
      // No password for OAuth users
    }).returning();
    return user;
  }
  async getAllUsers() {
    return await db.select().from(users);
  }
  async updateUserPassword(id, newPassword) {
    await db.update(users).set({
      password: newPassword,
      resetAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, id));
  }
  async deleteUser(id) {
    await db.delete(users).where(eq(users.id, id));
  }
  async updateUserOpenAIKey(userId, apiKeyHash) {
    await db.update(users).set({
      openaiKeyHash: apiKeyHash,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
  }
  async updateDefaultAssistant(userId, assistantId) {
    await db.update(users).set({
      defaultAssistantId: assistantId,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
  }
  async updateResetTimestamp(userId) {
    await db.update(users).set({
      resetAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
  }
  async clearResetTimestamp(userId) {
    await db.update(users).set({
      resetAt: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
  }
  // OAuth management methods
  async findOrCreateOAuthProfile(provider, providerUserId, userId, accessToken, refreshToken) {
    const [existingProfile] = await db.select().from(oauthProfiles).where(
      and(
        eq(oauthProfiles.provider, provider),
        eq(oauthProfiles.providerUserId, providerUserId)
      )
    );
    if (existingProfile) {
      if (accessToken || refreshToken) {
        const updateData = {};
        if (accessToken) updateData.accessToken = accessToken;
        if (refreshToken) updateData.refreshToken = refreshToken;
        const [updated] = await db.update(oauthProfiles).set(updateData).where(eq(oauthProfiles.id, existingProfile.id)).returning();
        return updated;
      }
      return existingProfile;
    }
    const [profile] = await db.insert(oauthProfiles).values({
      provider,
      providerUserId,
      userId,
      accessToken,
      refreshToken
    }).returning();
    return profile;
  }
  async getOAuthProfileByProviderAndId(provider, providerUserId) {
    const [profile] = await db.select().from(oauthProfiles).where(
      and(
        eq(oauthProfiles.provider, provider),
        eq(oauthProfiles.providerUserId, providerUserId)
      )
    );
    return profile;
  }
  async getOAuthProfilesForUser(userId) {
    return await db.select().from(oauthProfiles).where(eq(oauthProfiles.userId, userId));
  }
  // Session management methods
  async createUserSession(userId, sessionId, userAgent, ipAddress) {
    const [session2] = await db.insert(userSessions).values({
      userId,
      sessionId,
      userAgent,
      ipAddress
    }).returning();
    return session2;
  }
  async getUserSessions(userId) {
    return await db.select().from(userSessions).where(
      and(
        eq(userSessions.userId, userId),
        eq(userSessions.isActive, true)
      )
    ).orderBy(desc(userSessions.lastActive));
  }
  async terminateUserSession(id) {
    await db.update(userSessions).set({ isActive: false }).where(eq(userSessions.id, id));
  }
  async terminateAllUserSessions(userId, exceptSessionId) {
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
    await db.update(userSessions).set({ isActive: false }).where(conditions);
  }
  async updateUserSessionActivity(sessionId) {
    await db.update(userSessions).set({ lastActive: /* @__PURE__ */ new Date() }).where(eq(userSessions.sessionId, sessionId));
  }
  // Assistant management methods
  async createAssistant(assistant) {
    const [createdAssistant] = await db.insert(assistants).values({
      ...assistant,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return createdAssistant;
  }
  async getAssistant(id) {
    const [assistant] = await db.select().from(assistants).where(eq(assistants.id, id));
    return assistant;
  }
  async getUserAssistants(userId) {
    return await db.select().from(assistants).where(eq(assistants.userId, userId)).orderBy(asc(assistants.name));
  }
  async updateAssistant(id, data) {
    const [updated] = await db.update(assistants).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(assistants.id, id)).returning();
    return updated;
  }
  async deleteAssistant(id) {
    await db.delete(assistants).where(eq(assistants.id, id));
  }
  // Thread management methods
  async createThread(userId, assistantId, openaiThreadId, title = "New Thread") {
    const [thread] = await db.insert(threads).values({
      userId,
      assistantId,
      openaiThreadId,
      title,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return thread;
  }
  async getThread(id) {
    const [thread] = await db.select().from(threads).where(eq(threads.id, id));
    return thread;
  }
  async getUserThreads(userId) {
    return await db.select().from(threads).where(eq(threads.userId, userId)).orderBy(desc(threads.updatedAt));
  }
  async updateThreadTitle(id, title) {
    await db.update(threads).set({
      title,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(threads.id, id));
  }
  async archiveThread(id) {
    await db.update(threads).set({
      isArchived: true,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(threads.id, id));
  }
  async deleteThread(id) {
    await db.delete(threads).where(eq(threads.id, id));
  }
  // Message management methods
  async addMessage(threadId, role, content, openaiMessageId) {
    const [message] = await db.insert(messages).values({
      threadId,
      role,
      content,
      openaiMessageId
    }).returning();
    await db.update(threads).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(threads.id, threadId));
    return message;
  }
  async getThreadMessages(threadId) {
    return await db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(asc(messages.createdAt));
  }
  // File management methods
  async addFile(userId, openaiFileId, filename, purpose, bytes, assistantId) {
    const [file] = await db.insert(files).values({
      userId,
      assistantId,
      openaiFileId,
      filename,
      purpose,
      bytes
    }).returning();
    return file;
  }
  async getUserFiles(userId) {
    return await db.select().from(files).where(eq(files.userId, userId)).orderBy(desc(files.createdAt));
  }
  async getAssistantFiles(assistantId) {
    return await db.select().from(files).where(eq(files.assistantId, assistantId)).orderBy(desc(files.createdAt));
  }
  async deleteFile(id) {
    await db.delete(files).where(eq(files.id, id));
  }
  // User Preferences methods
  async getUserPreferences(userId) {
    const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return preferences;
  }
  async createUserPreferences(preferences) {
    const [newPreferences] = await db.insert(userPreferences).values(preferences).returning();
    return newPreferences;
  }
  async updateUserPreferences(userId, preferences) {
    const [updated] = await db.update(userPreferences).set({
      ...preferences,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(userPreferences.userId, userId)).returning();
    if (!updated) {
      return this.createUserPreferences({
        userId,
        ...preferences
      });
    }
    return updated;
  }
  // Usage Analytics methods
  async trackUsage(usageData) {
    const [record] = await db.insert(usageAnalytics).values(usageData).returning();
    return record;
  }
  async getUserUsageAnalytics(userId, options) {
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
    const query = db.select().from(usageAnalytics).where(conditions).orderBy(desc(usageAnalytics.createdAt));
    if (options?.limit) {
      return await query.limit(options.limit).offset(options?.offset || 0);
    }
    return await query;
  }
  async getUserUsageSummary(userId, options) {
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
    const records = await db.select().from(usageAnalytics).where(conditions).orderBy(asc(usageAnalytics.createdAt));
    const totalRequests = records.length;
    const totalTokens = records.reduce((sum, record) => sum + record.totalTokens, 0);
    const totalCost = records.reduce((sum, record) => sum + record.estimatedCost, 0);
    const periodFormat = options?.groupBy || "day";
    const periodSummaries = [];
    const groupedRecords = {};
    for (const record of records) {
      const date = new Date(record.createdAt);
      let periodKey;
      if (periodFormat === "day") {
        periodKey = date.toISOString().split("T")[0];
      } else if (periodFormat === "week") {
        const day = date.getDay();
        const diff = date.getDate() - day;
        const firstDayOfWeek = new Date(date);
        firstDayOfWeek.setDate(diff);
        periodKey = firstDayOfWeek.toISOString().split("T")[0];
      } else if (periodFormat === "month") {
        periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      } else {
        periodKey = date.toISOString().split("T")[0];
      }
      if (!groupedRecords[periodKey]) {
        groupedRecords[periodKey] = [];
      }
      groupedRecords[periodKey].push(record);
    }
    for (const [period, periodRecords] of Object.entries(groupedRecords)) {
      const periodRequests = periodRecords.length;
      const periodTokens = periodRecords.reduce((sum, record) => sum + record.totalTokens, 0);
      const periodCost = periodRecords.reduce((sum, record) => sum + record.estimatedCost, 0);
      const models = {};
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
    periodSummaries.sort((a, b) => a.period.localeCompare(b.period));
    return {
      totalRequests,
      totalTokens,
      totalCost,
      periodSummaries
    };
  }
  // Fine-tuning management methods
  async createFineTuningJob(jobData) {
    const [job] = await db.insert(fineTuningJobs).values({
      ...jobData,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return job;
  }
  async getFineTuningJob(id) {
    const [job] = await db.select().from(fineTuningJobs).where(eq(fineTuningJobs.id, id));
    return job;
  }
  async getFineTuningJobByOpenAIId(openaiJobId) {
    const [job] = await db.select().from(fineTuningJobs).where(eq(fineTuningJobs.openaiJobId, openaiJobId));
    return job;
  }
  async getUserFineTuningJobs(userId) {
    return await db.select().from(fineTuningJobs).where(eq(fineTuningJobs.userId, userId)).orderBy(desc(fineTuningJobs.createdAt));
  }
  async updateFineTuningJob(id, data) {
    const [updated] = await db.update(fineTuningJobs).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(fineTuningJobs.id, id)).returning();
    return updated;
  }
  async deleteFineTuningJob(id) {
    await db.delete(fineTuningJobs).where(eq(fineTuningJobs.id, id));
  }
  // Fine-tuned models management methods
  async createFineTunedModel(modelData) {
    const [model] = await db.insert(fineTunedModels).values(modelData).returning();
    return model;
  }
  async getFineTunedModel(id) {
    const [model] = await db.select().from(fineTunedModels).where(eq(fineTunedModels.id, id));
    return model;
  }
  async getFineTunedModelByOpenAIId(openaiModelId) {
    const [model] = await db.select().from(fineTunedModels).where(eq(fineTunedModels.openaiModelId, openaiModelId));
    return model;
  }
  async getFile(id) {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }
  async getUserFineTunedModels(userId) {
    return await db.select().from(fineTunedModels).where(eq(fineTunedModels.userId, userId)).orderBy(desc(fineTunedModels.createdAt));
  }
  async updateFineTunedModelStatus(id, isActive) {
    await db.update(fineTunedModels).set({ isActive }).where(eq(fineTunedModels.id, id));
  }
  async deleteFineTunedModel(id) {
    await db.delete(fineTunedModels).where(eq(fineTunedModels.id, id));
  }
};
var storage = new DatabaseStorage();

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
  const timestamp2 = formatDate();
  let logLine = `[${timestamp2}] ${level.toUpperCase()}: ${message}`;
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

// server/analytics.ts
var MODEL_COSTS = {
  // GPT-4 models
  "gpt-4o": { input: 5e-3, output: 0.015 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-4-32k": { input: 0.06, output: 0.12 },
  // GPT-3.5 models
  "gpt-3.5-turbo": { input: 5e-4, output: 15e-4 },
  "gpt-3.5-turbo-16k": { input: 1e-3, output: 2e-3 },
  // Default cost for unknown models
  "default": { input: 0.01, output: 0.03 }
};
function calculateCost(model, promptTokens, completionTokens) {
  const modelCost = MODEL_COSTS[model] || MODEL_COSTS.default;
  const promptTokensK = promptTokens / 1e3;
  const completionTokensK = completionTokens / 1e3;
  const promptCost = promptTokensK * modelCost.input;
  const completionCost = completionTokensK * modelCost.output;
  return parseFloat((promptCost + completionCost).toFixed(6));
}
async function trackApiUsage(userId, requestType, modelId, promptTokens, completionTokens, assistantId, threadId, success = true, errorMessage, metadata) {
  try {
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = calculateCost(modelId, promptTokens, completionTokens);
    const usageData = {
      userId,
      assistantId,
      threadId,
      modelId,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      requestType,
      success,
      errorMessage,
      metadata
    };
    await storage.trackUsage(usageData);
  } catch (error) {
    console.error("Failed to track API usage:", error);
  }
}

// server/openai.ts
var DEFAULT_ASSISTANT_ID = process.env.ASSISTANT_ID;
var LOG_DIR2 = "./logs";
(async () => {
  try {
    await mkdir2(LOG_DIR2, { recursive: true });
  } catch (error) {
    logger.error("Error creating required directories:", error);
  }
})();
function createOpenAIClient(apiKey) {
  if (!apiKey) {
    logger.warn("Attempted to create OpenAI client without API key");
    return null;
  }
  try {
    return new OpenAI({
      apiKey
    });
  } catch (error) {
    logger.error("Error creating OpenAI client:", error);
    return null;
  }
}
async function logMessage(role, text2) {
  try {
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    const line = `[${timestamp2}] ${role.toUpperCase()}: ${text2}
`;
    const logFile = `${LOG_DIR2}/chat-${timestamp2.slice(0, 10)}.log`;
    await writeFile(logFile, line, { flag: "a" });
  } catch (error) {
    logger.error("Error logging message:", error);
  }
}
function validateUserApiKey(user) {
  if (!user.openaiKeyHash) {
    return { error: "Please set up your OpenAI API key in settings before using this feature" };
  }
  return null;
}
async function initThread(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const keyValidation = validateUserApiKey(user);
    if (keyValidation) {
      return res.status(400).json(keyValidation);
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }
    const openai = createOpenAIClient(apiKey);
    if (!openai) {
      return res.status(500).json({ error: "Failed to initialize OpenAI client" });
    }
    const thread = await openai.beta.threads.create();
    const assistantId = req.body.assistantId || user.defaultAssistantId || null;
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
  } catch (err) {
    logger.error("Error initializing thread:", err);
    res.status(500).json({ error: err.message });
  }
}
async function chatWithAssistant(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const keyValidation = validateUserApiKey(user);
    if (keyValidation) {
      return res.status(400).json(keyValidation);
    }
    const { threadId, message } = req.body;
    if (!threadId || !message) {
      return res.status(400).json({ error: "Thread ID and message are required" });
    }
    const thread = await storage.getThread(threadId);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }
    if (thread.userId !== user.id) {
      return res.status(403).json({ error: "You don't have access to this thread" });
    }
    let assistantId;
    if (thread.assistantId) {
      const assistant = await storage.getAssistant(thread.assistantId);
      if (!assistant || !assistant.openaiAssistantId) {
        return res.status(404).json({ error: "Assistant not found or not configured" });
      }
      assistantId = assistant.openaiAssistantId;
    } else if (user.defaultAssistantId) {
      const assistant = await storage.getAssistant(user.defaultAssistantId);
      if (!assistant || !assistant.openaiAssistantId) {
        return res.status(404).json({ error: "Default assistant not found or not configured" });
      }
      assistantId = assistant.openaiAssistantId;
    } else if (DEFAULT_ASSISTANT_ID) {
      assistantId = DEFAULT_ASSISTANT_ID;
    } else {
      return res.status(400).json({
        error: "No assistant configured. Please create an assistant or select a default assistant."
      });
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }
    const openai = createOpenAIClient(apiKey);
    if (!openai) {
      return res.status(500).json({ error: "Failed to initialize OpenAI client" });
    }
    await logMessage("user", message);
    await storage.addMessage(threadId, "user", message);
    await openai.beta.threads.messages.create(thread.openaiThreadId, {
      role: "user",
      content: message
    });
    const run = await openai.beta.threads.runs.create(thread.openaiThreadId, {
      assistant_id: assistantId
    });
    let status = await openai.beta.threads.runs.retrieve(thread.openaiThreadId, run.id);
    while (status.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      status = await openai.beta.threads.runs.retrieve(thread.openaiThreadId, run.id);
      if (["failed", "cancelled", "expired"].includes(status.status)) {
        return res.status(500).json({
          status: status.status,
          error: status.last_error?.message || `Run ${status.status}`
        });
      }
    }
    const messages2 = await openai.beta.threads.messages.list(thread.openaiThreadId);
    const assistantMsgs = messages2.data.filter((m) => m.run_id === run.id && m.role === "assistant");
    if (assistantMsgs.length === 0) {
      return res.status(500).json({ error: "No assistant response found" });
    }
    const responseContent = [];
    for (const msg of assistantMsgs) {
      for (const content of msg.content) {
        if (content.type === "text") {
          const text2 = content.text.value;
          await logMessage("assistant", text2);
          await storage.addMessage(threadId, "assistant", text2, msg.id);
          responseContent.push({
            type: "text",
            text: text2
          });
        }
      }
    }
    try {
      const usage = status.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      await trackApiUsage(
        user.id,
        "chat_completion",
        assistantId.includes("asst_") ? "gpt-4o" : assistantId,
        // Use model from assistant or default to latest
        usage.prompt_tokens,
        usage.completion_tokens,
        thread.assistantId || void 0,
        threadId,
        true,
        void 0,
        { runId: run.id }
      );
    } catch (analyticsError) {
      logger.error("Error tracking API usage:", analyticsError);
    }
    res.json({
      threadId,
      content: responseContent
    });
  } catch (err) {
    try {
      const user = req.user;
      if (user?.id) {
        const { threadId } = req.body;
        const thread = await storage.getThread(threadId);
        await trackApiUsage(
          user.id,
          "chat_completion",
          "unknown",
          // We don't know the model for failed requests
          0,
          0,
          // We don't have token counts for failed requests
          thread?.assistantId || void 0,
          threadId,
          false,
          err.message
        );
      }
    } catch (analyticsError) {
      logger.error("Error tracking failed API usage:", analyticsError);
    }
    logger.error("Error chatting with assistant:", err);
    res.status(500).json({ error: err.message });
  }
}
function getCompatibleFiles(dir, exts) {
  let out = [];
  try {
    for (let name of fs2.readdirSync(dir, { withFileTypes: true })) {
      const full = path2.join(dir, name.name);
      if (name.isDirectory()) {
        out.push(...getCompatibleFiles(full, exts));
      } else if (exts.includes(path2.extname(name.name).toLowerCase())) {
        out.push(full);
      }
    }
  } catch (error) {
    logger.error(`Error reading directory ${dir}:`, error);
  }
  return out;
}
async function uploadFiles(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const keyValidation = validateUserApiKey(user);
    if (keyValidation) {
      return res.status(400).json(keyValidation);
    }
    const assistantId = req.body.assistantId || user.defaultAssistantId;
    if (!assistantId) {
      return res.status(400).json({
        error: "No assistant specified. Please provide an assistantId or set a default assistant."
      });
    }
    const assistant = await storage.getAssistant(assistantId);
    if (!assistant) {
      return res.status(404).json({ error: "Assistant not found" });
    }
    if (assistant.userId !== user.id) {
      return res.status(403).json({ error: "You don't have access to this assistant" });
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }
    const openai = createOpenAIClient(apiKey);
    if (!openai) {
      return res.status(500).json({ error: "Failed to initialize OpenAI client" });
    }
    if (!assistant.openaiAssistantId) {
      const openaiAssistant = await openai.beta.assistants.create({
        name: assistant.name,
        description: assistant.description || void 0,
        instructions: assistant.instructions || void 0,
        model: assistant.model,
        tools: [{ type: "retrieval" }]
      });
      await storage.updateAssistant(assistant.id, {
        openaiAssistantId: openaiAssistant.id
      });
      assistant.openaiAssistantId = openaiAssistant.id;
    }
    const existingFiles = await storage.getAssistantFiles(assistant.id);
    const existingFileIds = existingFiles.map((f) => f.openaiFileId);
    let toUpload = [];
    if (req.files?.file) {
      toUpload = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
    } else if (req.body.dir) {
      const exts = [".jsonl", ".txt", ".csv", ".pdf", ".docx"];
      const paths = getCompatibleFiles(req.body.dir, exts);
      toUpload = paths.map((p) => ({
        name: path2.basename(p),
        mv: null,
        data: fs2.createReadStream(p)
      }));
    } else {
      return res.status(400).json({ error: "No file or directory provided" });
    }
    const newFileIds = [];
    for (let f of toUpload) {
      try {
        const file = await openai.files.create({
          file: f.data || fs2.createReadStream(f.tempFilePath || f),
          purpose: "assistants"
        });
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
      }
    }
    if (newFileIds.length === 0) {
      return res.status(400).json({ error: "No files were successfully uploaded" });
    }
    const allFileIds = [...existingFileIds, ...newFileIds];
    await openai.beta.assistants.update(assistant.openaiAssistantId, {
      tools: [{ type: "retrieval" }],
      file_ids: allFileIds
    });
    await storage.updateAssistant(assistant.id, {
      fileIds: allFileIds
    });
    res.json({
      assistantId: assistant.id,
      fileIds: allFileIds,
      message: `Successfully uploaded ${newFileIds.length} file(s)`
    });
  } catch (err) {
    logger.error("Error uploading files:", err);
    res.status(500).json({ error: err.message });
  }
}
export {
  chatWithAssistant,
  createOpenAIClient,
  initThread,
  uploadFiles,
  validateUserApiKey
};
