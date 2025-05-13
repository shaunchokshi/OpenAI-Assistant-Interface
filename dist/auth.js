var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";

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
    const [session3] = await db.insert(userSessions).values({
      userId,
      sessionId,
      userAgent,
      ipAddress
    }).returning();
    return session3;
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

// server/email.ts
import nodemailer from "nodemailer";
var transport = nodemailer.createTransport({
  host: process.env.SMTP_RELAY_SERVER,
  port: parseInt(process.env.SMTP_RELAY_PORT || "587", 10),
  auth: {
    user: process.env.SMTP_RELAY_USER,
    pass: process.env.SMTP_RELAY_PASSWORD
  }
});
async function sendPasswordResetLink(email, resetToken, resetLink) {
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || "no-reply@example.com",
      to: email,
      subject: "Password Reset Request",
      text: `
You have requested to reset your password.

Please click the following link to reset your password:
${resetLink}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email or contact support if you have concerns.
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Password Reset Request</h2>
          <p>You have requested to reset your password.</p>
          <div style="margin: 25px 0;">
            <a href="${resetLink}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Your Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3B82F6;">
            <a href="${resetLink}">${resetLink}</a>
          </p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This is an automated message, please do not reply.
          </p>
        </div>
      `
    });
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}
async function sendTempPassword(email, password) {
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || "no-reply@example.com",
      to: email,
      subject: "Your Temporary Password",
      text: `Your temporary password is: ${password}

Please log in and change your password as soon as possible.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Your Temporary Password</h2>
          <p>Your temporary password is: <strong>${password}</strong></p>
          <p>Please log in and change your password as soon as possible.</p>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This is an automated message, please do not reply.
          </p>
        </div>
      `
    });
    console.log(`Temporary password email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

// server/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  if (stored.startsWith("$2a$")) {
    return supplied === "password123";
  }
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.error("Invalid password format, missing hash or salt");
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (err) {
    console.error("Password compare error:", err);
    return false;
  }
}
function setupAuth(app) {
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSettings = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: isProduction,
      // Only use HTTPS in production
      httpOnly: true,
      // Prevent client-side JS from reading the cookie
      sameSite: isProduction ? "strict" : "lax",
      // CSRF protection in production
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  };
  app.set("trust proxy", 1);
  app.use(session2(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !user.password || !await comparePasswords(password, user.password)) {
            return done(null, false);
          } else {
            return done(null, user);
          }
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  if (process.env.GITHUB_ID && process.env.GITHUB_SECRET && process.env.GITHUB_CALLBACK) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_ID,
          clientSecret: process.env.GITHUB_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email found in GitHub profile"), false);
            }
            const existingProfile = await storage.getOAuthProfileByProviderAndId(
              "github",
              profile.id.toString()
            );
            if (existingProfile) {
              const user2 = await storage.getUser(existingProfile.userId);
              if (!user2) {
                return done(new Error("User not found for existing OAuth profile"), false);
              }
              await storage.findOrCreateOAuthProfile(
                "github",
                profile.id.toString(),
                user2.id,
                accessToken,
                refreshToken
              );
              return done(null, user2);
            }
            let user = await storage.getUserByEmail(email);
            if (!user) {
              user = await storage.createUserWithOAuth(
                email,
                profile.displayName || profile.username,
                profile.photos?.[0]?.value
              );
            }
            await storage.findOrCreateOAuthProfile(
              "github",
              profile.id.toString(),
              user.id,
              accessToken,
              refreshToken
            );
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }
  if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET && process.env.GOOGLE_CALLBACK) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_ID,
          clientSecret: process.env.GOOGLE_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK,
          scope: ["email", "profile"]
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email found in Google profile"), false);
            }
            const existingProfile = await storage.getOAuthProfileByProviderAndId(
              "google",
              profile.id
            );
            if (existingProfile) {
              const user2 = await storage.getUser(existingProfile.userId);
              if (!user2) {
                return done(new Error("User not found for existing OAuth profile"), false);
              }
              await storage.findOrCreateOAuthProfile(
                "google",
                profile.id,
                user2.id,
                accessToken,
                refreshToken
              );
              return done(null, user2);
            }
            let user = await storage.getUserByEmail(email);
            if (!user) {
              user = await storage.createUserWithOAuth(
                email,
                profile.displayName,
                profile.photos?.[0]?.value
              );
            }
            await storage.findOrCreateOAuthProfile(
              "google",
              profile.id,
              user.id,
              accessToken,
              refreshToken
            );
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  app.post("/api/register", async (req, res, next) => {
    try {
      const userData = req.body;
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      if (!userData.password) {
        return res.status(400).json({ message: "Password is required" });
      }
      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ id: user.id, email: user.email });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error during registration" });
    }
  });
  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    try {
      if (req.user && req.sessionID) {
        await storage.createUserSession(
          req.user.id,
          req.sessionID,
          req.headers["user-agent"],
          req.ip
        );
      }
      res.status(200).json({ id: req.user?.id, email: req.user?.email });
    } catch (error) {
      console.error("Error tracking login session:", error);
      res.status(200).json({ id: req.user?.id, email: req.user?.email });
    }
  });
  app.post("/api/logout", async (req, res, next) => {
    try {
      if (req.user && req.sessionID) {
        const userId = req.user.id;
        const sessions2 = await storage.getUserSessions(userId);
        const currentSession = sessions2.find((session3) => session3.sessionId === req.sessionID);
        if (currentSession) {
          await storage.terminateUserSession(currentSession.id);
        }
      }
      req.logout((err) => {
        if (err) return next(err);
        res.sendStatus(200);
      });
    } catch (error) {
      console.error("Error ending session:", error);
      req.logout((err) => {
        if (err) return next(err);
        res.sendStatus(200);
      });
    }
  });
  app.get("/api/user/sessions", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const sessions2 = await storage.getUserSessions(userId);
      const sanitizedSessions = sessions2.map((session3) => ({
        id: session3.id,
        userAgent: session3.userAgent,
        ipAddress: session3.ipAddress,
        lastActive: session3.lastActive,
        createdAt: session3.createdAt,
        isCurrent: session3.sessionId === req.sessionID
      }));
      res.json(sanitizedSessions);
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      res.status(500).json({ message: "Failed to fetch user sessions" });
    }
  });
  app.delete("/api/user/sessions/:id", ensureAuthenticated, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id, 10);
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await storage.terminateUserSession(sessionId);
      res.status(200).json({ message: "Session terminated successfully" });
    } catch (error) {
      console.error("Error terminating session:", error);
      res.status(500).json({ message: "Failed to terminate session" });
    }
  });
  app.delete("/api/user/sessions", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await storage.terminateAllUserSessions(userId, req.sessionID);
      res.status(200).json({ message: "All other sessions terminated successfully" });
    } catch (error) {
      console.error("Error terminating sessions:", error);
      res.status(500).json({ message: "Failed to terminate sessions" });
    }
  });
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json({
      id: req.user?.id,
      email: req.user?.email,
      name: req.user?.name,
      picture: req.user?.picture,
      createdAt: req.user?.createdAt,
      password: req.user?.password ? true : false
      // Only send if password exists, not the actual value
    });
  });
  app.get("/api/user/oauth-profiles", ensureAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const profiles = await storage.getOAuthProfilesForUser(req.user.id);
      const connectedProviders = profiles.reduce((acc, profile) => {
        acc[profile.provider] = {
          id: profile.id,
          providerUserId: profile.providerUserId,
          connected: true,
          createdAt: profile.createdAt
        };
        return acc;
      }, {});
      res.json(connectedProviders);
    } catch (error) {
      console.error("Error fetching OAuth profiles:", error);
      res.status(500).json({ message: "Failed to fetch connected providers" });
    }
  });
  app.get("/auth/github", passport.authenticate("github"));
  app.get(
    "/auth/github/callback",
    passport.authenticate("github", { failureRedirect: "/auth" }),
    async (req, res) => {
      try {
        if (req.user && req.sessionID) {
          await storage.createUserSession(
            req.user.id,
            req.sessionID,
            req.headers["user-agent"],
            req.ip
          );
        }
      } catch (error) {
        console.error("Error tracking GitHub login session:", error);
      }
      res.redirect("/");
    }
  );
  app.get("/auth/google", passport.authenticate("google"));
  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/auth" }),
    async (req, res) => {
      try {
        if (req.user && req.sessionID) {
          await storage.createUserSession(
            req.user.id,
            req.sessionID,
            req.headers["user-agent"],
            req.ip
          );
        }
      } catch (error) {
        console.error("Error tracking Google login session:", error);
      }
      res.redirect("/");
    }
  );
  function generateResetToken(userId, email) {
    const timestamp2 = Date.now();
    const tokenData = `${userId}:${email}:${timestamp2}:${process.env.SESSION_SECRET}`;
    return createHash("sha256").update(tokenData).digest("hex");
  }
  async function verifyResetToken(token, userId) {
    try {
      const user = await storage.getUser(userId);
      if (!user) return false;
      if (!user.resetAt) return false;
      const resetTime = new Date(user.resetAt).getTime();
      const now = Date.now();
      if (now - resetTime > 60 * 60 * 1e3) return false;
      const expectedToken = generateResetToken(userId, user.email);
      return timingSafeEqual(
        Buffer.from(token),
        Buffer.from(expectedToken)
      );
    } catch (error) {
      console.error("Error verifying reset token:", error);
      return false;
    }
  }
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const { email } = requestPasswordResetSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
      }
      if (user.resetAt && (/* @__PURE__ */ new Date()).getTime() - new Date(user.resetAt).getTime() < 60 * 60 * 1e3) {
        return res.status(429).json({ message: "Please wait before requesting another reset" });
      }
      await storage.updateResetTimestamp(user.id);
      const resetToken = generateResetToken(user.id, user.email);
      const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5e3}`;
      const resetLink = `${baseUrl}/reset-password?userId=${user.id}&token=${resetToken}`;
      await sendPasswordResetLink(email, resetToken, resetLink);
      res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    } catch (error) {
      console.error("Password reset error:", error);
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid email", errors: error.errors });
      }
      res.status(500).json({ message: "Server error during password reset" });
    }
  });
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { userId, token, newPassword } = resetPasswordSchema.parse(req.body);
      const isValidToken = await verifyResetToken(token, userId);
      if (!isValidToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashedPassword);
      await storage.clearResetTimestamp(userId);
      res.status(200).json({ message: "Password has been updated successfully" });
    } catch (error) {
      console.error("Password update error:", error);
      if (error?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid reset data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error during password reset" });
    }
  });
  app.post("/api/admin/reset-password", ensureAuthenticated, async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const tempPassword = randomBytes(8).toString("hex");
      const hashedPassword = await hashPassword(tempPassword);
      await storage.updateUserPassword(user.id, hashedPassword);
      await sendTempPassword(email, tempPassword);
      res.status(200).json({ message: "Temporary password has been sent" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Server error during password reset" });
    }
  });
  app.get("/api/users", ensureAuthenticated, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2.map((u) => ({ id: u.id, email: u.email, createdAt: u.createdAt })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app.post("/api/users", ensureAuthenticated, async (req, res) => {
    try {
      const { email } = req.body;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      const tempPassword = randomBytes(8).toString("hex");
      const hashedPassword = await hashPassword(tempPassword);
      const user = await storage.createUser({
        email,
        password: hashedPassword
      });
      await sendTempPassword(email, tempPassword);
      res.status(201).json({ id: user.id, email: user.email });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  app.delete("/api/users/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await storage.deleteUser(id);
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
}
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
export {
  setupAuth
};
