var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/fine-tuning.ts
import OpenAI from "openai";

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

// server/fine-tuning.ts
var openai;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  } else {
    console.warn("OPENAI_API_KEY not set. Fine-tuning features will be disabled.");
  }
} catch (error) {
  console.error("Error initializing OpenAI client:", error);
}
var MODELS_INFO = {
  "gpt-3.5-turbo": {
    description: "Most capable GPT-3.5 model optimized for chat at 1/10th the cost of gpt-4.",
    context_length: 16385,
    training_cost_per_1k: 8e-3,
    input_cost_per_1k: 15e-4,
    output_cost_per_1k: 2e-3
  },
  "babbage-002": {
    description: "Lightweight model optimized for classification, semantic search, and generally tasks that do not require long outputs.",
    context_length: 16384,
    training_cost_per_1k: 4e-4,
    input_cost_per_1k: 4e-4,
    output_cost_per_1k: 4e-4
  },
  "davinci-002": {
    description: "Most capable second-generation model, optimized for complex tasks.",
    context_length: 16384,
    training_cost_per_1k: 3e-3,
    input_cost_per_1k: 3e-3,
    output_cost_per_1k: 3e-3
  }
};
async function getFineTunableModels(req, res) {
  try {
    return res.status(200).json(MODELS_INFO);
  } catch (error) {
    console.error("Error fetching fine-tunable models:", error);
    return res.status(500).json({ error: "Failed to fetch fine-tunable models" });
  }
}
async function createFineTuningJob(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const { name, baseModel, trainingFileId, validationFileId, hyperparameters } = req.body;
    if (!name || !baseModel || !trainingFileId) {
      return res.status(400).json({ error: "Missing required fields: name, baseModel, trainingFileId" });
    }
    if (!MODELS_INFO[baseModel]) {
      return res.status(400).json({ error: `Model ${baseModel} is not supported for fine-tuning` });
    }
    const trainingFile = await storage.getFile(trainingFileId);
    if (!trainingFile) {
      return res.status(404).json({ error: "Training file not found" });
    }
    let validationFile = null;
    if (validationFileId) {
      validationFile = await storage.getFile(validationFileId);
      if (!validationFile) {
        return res.status(404).json({ error: "Validation file not found" });
      }
    }
    if (!openai) {
      return res.status(503).json({
        error: "Fine-tuning service unavailable",
        details: "OpenAI API key not configured"
      });
    }
    const openaiJob = await openai.fineTuning.jobs.create({
      training_file: trainingFile.openaiFileId,
      validation_file: validationFile?.openaiFileId,
      model: baseModel,
      hyperparameters: hyperparameters || void 0
    });
    await trackApiUsage(
      req.user.id,
      "fine-tuning",
      baseModel,
      0,
      // promptTokens
      0,
      // completionTokens
      void 0,
      // assistantId
      void 0,
      // threadId
      true,
      // success
      void 0,
      // errorMessage
      {
        // metadata
        jobId: openaiJob.id,
        trainingFile: trainingFile.filename,
        validationFile: validationFile?.filename
      }
    );
    const job = await storage.createFineTuningJob({
      userId: req.user.id,
      openaiJobId: openaiJob.id,
      name,
      baseModel,
      trainingFileId: trainingFile.id,
      validationFileId: validationFile?.id || null,
      hyperparameters: hyperparameters || {},
      status: openaiJob.status
    });
    return res.status(201).json(job);
  } catch (error) {
    console.error("Error creating fine-tuning job:", error);
    return res.status(500).json({
      error: "Failed to create fine-tuning job",
      details: error.message || "Unknown error occurred"
    });
  }
}
async function getUserFineTuningJobs(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const jobs = await storage.getUserFineTuningJobs(req.user.id);
    return res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching fine-tuning jobs:", error);
    return res.status(500).json({ error: "Failed to fetch fine-tuning jobs" });
  }
}
async function getFineTuningJobDetails(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({ error: "Invalid job ID" });
    }
    const job = await storage.getFineTuningJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Fine-tuning job not found" });
    }
    if (job.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to access this job" });
    }
    if (job.openaiJobId && openai) {
      try {
        const openaiJob = await openai.fineTuning.jobs.retrieve(job.openaiJobId);
        if (job.status !== openaiJob.status) {
          await storage.updateFineTuningJob(job.id, {
            status: openaiJob.status,
            trainedTokens: openaiJob.trained_tokens || 0,
            fineTunedModelName: openaiJob.fine_tuned_model,
            error: openaiJob.error?.message || null
          });
          if (openaiJob.status === "succeeded" && openaiJob.fine_tuned_model) {
            const existingModel = await storage.getFineTunedModelByOpenAIId(openaiJob.fine_tuned_model);
            if (!existingModel) {
              await storage.createFineTunedModel({
                userId: req.user.id,
                jobId: job.id,
                openaiModelId: openaiJob.fine_tuned_model,
                name: `${job.name} (${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]})`,
                baseModel: job.baseModel,
                isActive: true
              });
            }
          }
          const updatedJob = await storage.getFineTuningJob(jobId);
          return res.status(200).json(updatedJob);
        }
      } catch (openaiError) {
        console.error("Error fetching job from OpenAI:", openaiError);
      }
    }
    return res.status(200).json(job);
  } catch (error) {
    console.error("Error fetching fine-tuning job details:", error);
    return res.status(500).json({ error: "Failed to fetch fine-tuning job details" });
  }
}
async function cancelFineTuningJob(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({ error: "Invalid job ID" });
    }
    const job = await storage.getFineTuningJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Fine-tuning job not found" });
    }
    if (job.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to cancel this job" });
    }
    if (["succeeded", "failed", "cancelled"].includes(job.status)) {
      return res.status(400).json({ error: `Job cannot be cancelled (status: ${job.status})` });
    }
    if (!job.openaiJobId) {
      return res.status(400).json({ error: "Job has no OpenAI ID" });
    }
    if (openai) {
      try {
        await openai.fineTuning.jobs.cancel(job.openaiJobId);
      } catch (openaiError) {
        console.error("Error cancelling job in OpenAI:", openaiError);
      }
    } else {
      console.warn("OpenAI client not available, skipping API cancellation");
    }
    await storage.updateFineTuningJob(job.id, {
      status: "cancelled",
      updatedAt: /* @__PURE__ */ new Date()
    });
    const updatedJob = await storage.getFineTuningJob(jobId);
    return res.status(200).json(updatedJob);
  } catch (error) {
    console.error("Error cancelling fine-tuning job:", error);
    return res.status(500).json({ error: "Failed to cancel fine-tuning job" });
  }
}
async function getUserFineTunedModels(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const models = await storage.getUserFineTunedModels(req.user.id);
    return res.status(200).json(models);
  } catch (error) {
    console.error("Error fetching fine-tuned models:", error);
    return res.status(500).json({ error: "Failed to fetch fine-tuned models" });
  }
}
async function updateFineTunedModelStatus(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const modelId = parseInt(req.params.id);
    if (isNaN(modelId)) {
      return res.status(400).json({ error: "Invalid model ID" });
    }
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive must be a boolean" });
    }
    const model = await storage.getFineTunedModel(modelId);
    if (!model) {
      return res.status(404).json({ error: "Fine-tuned model not found" });
    }
    if (model.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to update this model" });
    }
    await storage.updateFineTunedModelStatus(modelId, isActive);
    const updatedModel = await storage.getFineTunedModel(modelId);
    return res.status(200).json(updatedModel);
  } catch (error) {
    console.error("Error updating fine-tuned model status:", error);
    return res.status(500).json({ error: "Failed to update fine-tuned model status" });
  }
}
async function deleteFineTunedModel(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const modelId = parseInt(req.params.id);
    if (isNaN(modelId)) {
      return res.status(400).json({ error: "Invalid model ID" });
    }
    const model = await storage.getFineTunedModel(modelId);
    if (!model) {
      return res.status(404).json({ error: "Fine-tuned model not found" });
    }
    if (model.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to delete this model" });
    }
    await storage.updateFineTunedModelStatus(modelId, false);
    return res.status(200).json({ message: "Model marked as inactive" });
  } catch (error) {
    console.error("Error deleting fine-tuned model:", error);
    return res.status(500).json({ error: "Failed to delete fine-tuned model" });
  }
}
export {
  cancelFineTuningJob,
  createFineTuningJob,
  deleteFineTunedModel,
  getFineTunableModels,
  getFineTuningJobDetails,
  getUserFineTunedModels,
  getUserFineTuningJobs,
  updateFineTunedModelStatus
};
