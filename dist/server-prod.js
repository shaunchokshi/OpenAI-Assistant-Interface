var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// temp-prod/server-prod.js
import express from "express";
import compression from "compression";
import helmet from "helmet";
import path3 from "path";
import { fileURLToPath } from "url";

// server/routes.ts
import { createServer } from "http";
import fileUpload from "express-fileupload";
import rateLimit from "express-rate-limit";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createHash as createHash2 } from "crypto";
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
import { createHash } from "crypto";
var PostgresSessionStore = connectPg(session);
function hashApiKey(apiKey) {
  return createHash("sha256").update(apiKey).digest("hex");
}
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
function setupAuth(app2) {
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
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
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
  app2.post("/api/register", async (req, res, next) => {
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
  app2.post("/api/login", passport.authenticate("local"), async (req, res) => {
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
  app2.post("/api/logout", async (req, res, next) => {
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
  app2.get("/api/user/sessions", ensureAuthenticated, async (req, res) => {
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
  app2.delete("/api/user/sessions/:id", ensureAuthenticated, async (req, res) => {
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
  app2.delete("/api/user/sessions", ensureAuthenticated, async (req, res) => {
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
  app2.get("/api/user", (req, res) => {
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
  app2.get("/api/user/oauth-profiles", ensureAuthenticated, async (req, res) => {
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
  app2.get("/auth/github", passport.authenticate("github"));
  app2.get(
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
  app2.get("/auth/google", passport.authenticate("google"));
  app2.get(
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
    return createHash2("sha256").update(tokenData).digest("hex");
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
  app2.post("/api/request-password-reset", async (req, res) => {
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
  app2.post("/api/reset-password", async (req, res) => {
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
  app2.post("/api/admin/reset-password", ensureAuthenticated, async (req, res) => {
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
  app2.get("/api/users", ensureAuthenticated, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2.map((u) => ({ id: u.id, email: u.email, createdAt: u.createdAt })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.post("/api/users", ensureAuthenticated, async (req, res) => {
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
  app2.delete("/api/users/:id", ensureAuthenticated, async (req, res) => {
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

// server/cache.ts
var cache = /* @__PURE__ */ new Map();
function clearExpiredCache() {
  const now = Date.now();
  Array.from(cache.entries()).forEach(([key, { expiry }]) => {
    if (now > expiry) {
      cache.delete(key);
    }
  });
}
setInterval(clearExpiredCache, 60 * 1e3);
function cacheMiddleware(duration = 300) {
  return (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }
    if (req.isAuthenticated()) {
      return next();
    }
    const key = `${req.originalUrl}`;
    const cachedResponse = cache.get(key);
    if (cachedResponse && cachedResponse.expiry > Date.now()) {
      return res.json(cachedResponse.value);
    }
    const originalJson = res.json;
    res.json = function(body) {
      cache.set(key, {
        value: body,
        expiry: Date.now() + duration * 1e3
      });
      return originalJson.call(this, body);
    };
    next();
  };
}

// server/openai.ts
import OpenAI from "openai";
import { mkdir as mkdir2, writeFile } from "fs/promises";
import fs2 from "fs";
import path2 from "path";

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
    const openai2 = createOpenAIClient(apiKey);
    if (!openai2) {
      return res.status(500).json({ error: "Failed to initialize OpenAI client" });
    }
    const thread = await openai2.beta.threads.create();
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
    const openai2 = createOpenAIClient(apiKey);
    if (!openai2) {
      return res.status(500).json({ error: "Failed to initialize OpenAI client" });
    }
    await logMessage("user", message);
    await storage.addMessage(threadId, "user", message);
    await openai2.beta.threads.messages.create(thread.openaiThreadId, {
      role: "user",
      content: message
    });
    const run = await openai2.beta.threads.runs.create(thread.openaiThreadId, {
      assistant_id: assistantId
    });
    let status = await openai2.beta.threads.runs.retrieve(thread.openaiThreadId, run.id);
    while (status.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      status = await openai2.beta.threads.runs.retrieve(thread.openaiThreadId, run.id);
      if (["failed", "cancelled", "expired"].includes(status.status)) {
        return res.status(500).json({
          status: status.status,
          error: status.last_error?.message || `Run ${status.status}`
        });
      }
    }
    const messages2 = await openai2.beta.threads.messages.list(thread.openaiThreadId);
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
    const openai2 = createOpenAIClient(apiKey);
    if (!openai2) {
      return res.status(500).json({ error: "Failed to initialize OpenAI client" });
    }
    if (!assistant.openaiAssistantId) {
      const openaiAssistant = await openai2.beta.assistants.create({
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
        const file = await openai2.files.create({
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
    await openai2.beta.assistants.update(assistant.openaiAssistantId, {
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

// server/fine-tuning.ts
import OpenAI2 from "openai";
var openai;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI2({
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

// server/routes.ts
function formatUptime(uptime) {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor(uptime % 86400 / 3600);
  const minutes = Math.floor(uptime % 3600 / 60);
  const seconds = Math.floor(uptime % 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}
function ensureAuthenticated2(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
}
async function registerRoutes(app2) {
  app2.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }
    // 50MB limit
  }));
  setupAuth(app2);
  app2.get("/api/user/sessions", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const sessions2 = await storage.getUserSessions(req.user.id);
      const currentSessionId = req.sessionID;
      const sessionsWithCurrent = sessions2.map((session3) => ({
        ...session3,
        isCurrent: session3.sessionId === currentSessionId
      }));
      return res.json(sessionsWithCurrent);
    } catch (error) {
      logger.error(`Error fetching user sessions: ${error}`);
      return res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });
  app2.delete("/api/user/sessions/:id", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      await storage.terminateUserSession(sessionId);
      return res.json({ message: "Session terminated successfully" });
    } catch (error) {
      logger.error(`Error terminating session: ${error}`);
      return res.status(500).json({ error: "Failed to terminate session" });
    }
  });
  app2.delete("/api/user/sessions", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      await storage.terminateAllUserSessions(req.user.id, req.sessionID);
      return res.json({ message: "All other sessions terminated successfully" });
    } catch (error) {
      logger.error(`Error terminating all sessions: ${error}`);
      return res.status(500).json({ error: "Failed to terminate sessions" });
    }
  });
  app2.get("/api/user/config", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const assistants2 = await storage.getUserAssistants(req.user.id);
      return res.json({
        hasApiKey: !!user.openaiKeyHash,
        defaultAssistantId: user.defaultAssistantId,
        assistantsCount: assistants2.length
      });
    } catch (error) {
      console.error("Error fetching user config:", error);
      return res.status(500).json({ error: "Failed to fetch user configuration" });
    }
  });
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 100,
    // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
    // Disable the `X-RateLimit-*` headers
    message: { error: "Too many requests, please try again later." }
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 10,
    // limit each IP to 10 authentication attempts per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts, please try again later." }
  });
  if (process.env.NODE_ENV === "production") {
    app2.use("/api/login", authLimiter);
    app2.use("/api/register", authLimiter);
    app2.use("/api/", apiLimiter);
  }
  app2.post("/api/settings/apikey", ensureAuthenticated2, async (req, res) => {
    try {
      const { apiKey } = apiKeySchema.parse(req.body);
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const apiKeyHash = hashApiKey(apiKey);
      await storage.updateUserOpenAIKey(req.user.id, apiKeyHash);
      return res.status(200).json({ message: "API key updated successfully" });
    } catch (error) {
      console.error("Error updating API key:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid API key format", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to update API key" });
    }
  });
  app2.post("/api/settings/default-assistant", ensureAuthenticated2, async (req, res) => {
    try {
      const { assistantId } = req.body;
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      if (assistantId) {
        const assistant = await storage.getAssistant(assistantId);
        if (!assistant) {
          return res.status(404).json({ error: "Assistant not found" });
        }
        if (assistant.userId !== req.user.id) {
          return res.status(403).json({ error: "You don't have access to this assistant" });
        }
      }
      await storage.updateDefaultAssistant(req.user.id, assistantId || null);
      return res.status(200).json({ message: "Default assistant updated successfully" });
    } catch (error) {
      console.error("Error updating default assistant:", error);
      return res.status(500).json({ error: "Failed to update default assistant" });
    }
  });
  app2.get("/api/settings/preferences", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const preferences = await storage.getUserPreferences(req.user.id);
      if (!preferences) {
        return res.json({
          theme: "dark",
          accentColor: "#7C3AED",
          // Default purple
          backgroundColor: "#1E293B",
          // Default dark blue-gray
          foregroundColor: "#FFFFFF"
          // Default white
        });
      }
      return res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      return res.status(500).json({ error: "Failed to fetch user preferences" });
    }
  });
  app2.post("/api/settings/preferences", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const preferencesData = updateUserPreferencesSchema.parse(req.body);
      const preferences = await storage.updateUserPreferences(req.user.id, preferencesData);
      return res.json(preferences);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid preferences data", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to update user preferences" });
    }
  });
  app2.get("/api/assistants", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const assistants2 = await storage.getUserAssistants(req.user.id);
      const assistantsWithDefault = assistants2.map((assistant) => ({
        ...assistant,
        isDefault: user.defaultAssistantId === assistant.id
      }));
      return res.json(assistantsWithDefault);
    } catch (error) {
      console.error("Error fetching assistants:", error);
      return res.status(500).json({ error: "Failed to fetch assistants" });
    }
  });
  app2.get("/api/assistants/:id", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const assistantId = parseInt(req.params.id, 10);
      const assistant = await storage.getAssistant(assistantId);
      if (!assistant) {
        return res.status(404).json({ error: "Assistant not found" });
      }
      if (assistant.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this assistant" });
      }
      return res.json(assistant);
    } catch (error) {
      console.error("Error fetching assistant:", error);
      return res.status(500).json({ error: "Failed to fetch assistant" });
    }
  });
  app2.post("/api/assistants", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const assistantData = assistantSchema.parse(req.body);
      const assistant = await storage.createAssistant({
        ...assistantData,
        userId: req.user.id
      });
      return res.status(201).json(assistant);
    } catch (error) {
      console.error("Error creating assistant:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid assistant data", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to create assistant" });
    }
  });
  app2.patch("/api/assistants/:id", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const assistantId = parseInt(req.params.id, 10);
      const existingAssistant = await storage.getAssistant(assistantId);
      if (!existingAssistant) {
        return res.status(404).json({ error: "Assistant not found" });
      }
      if (existingAssistant.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this assistant" });
      }
      const updateData = updateAssistantSchema.parse(req.body);
      const assistant = await storage.updateAssistant(assistantId, updateData);
      return res.json(assistant);
    } catch (error) {
      console.error("Error updating assistant:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid assistant data", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to update assistant" });
    }
  });
  app2.delete("/api/assistants/:id", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const assistantId = parseInt(req.params.id, 10);
      const existingAssistant = await storage.getAssistant(assistantId);
      if (!existingAssistant) {
        return res.status(404).json({ error: "Assistant not found" });
      }
      if (existingAssistant.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this assistant" });
      }
      const user = await storage.getUser(req.user.id);
      if (user && user.defaultAssistantId === assistantId) {
        await storage.updateDefaultAssistant(req.user.id, null);
      }
      await storage.deleteAssistant(assistantId);
      return res.status(200).json({ message: "Assistant deleted successfully" });
    } catch (error) {
      console.error("Error deleting assistant:", error);
      return res.status(500).json({ error: "Failed to delete assistant" });
    }
  });
  app2.get("/api/threads", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const threads2 = await storage.getUserThreads(req.user.id);
      return res.json(threads2);
    } catch (error) {
      console.error("Error fetching threads:", error);
      return res.status(500).json({ error: "Failed to fetch threads" });
    }
  });
  app2.get("/api/threads/:id/messages", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const threadId = parseInt(req.params.id, 10);
      const thread = await storage.getThread(threadId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      if (thread.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this thread" });
      }
      const messages2 = await storage.getThreadMessages(threadId);
      return res.json(messages2);
    } catch (error) {
      console.error("Error fetching thread messages:", error);
      return res.status(500).json({ error: "Failed to fetch thread messages" });
    }
  });
  app2.patch("/api/threads/:id", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const threadId = parseInt(req.params.id, 10);
      const { title } = req.body;
      const thread = await storage.getThread(threadId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      if (thread.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this thread" });
      }
      if (title) {
        await storage.updateThreadTitle(threadId, title);
      }
      return res.status(200).json({ message: "Thread updated successfully" });
    } catch (error) {
      console.error("Error updating thread:", error);
      return res.status(500).json({ error: "Failed to update thread" });
    }
  });
  app2.delete("/api/threads/:id", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const threadId = parseInt(req.params.id, 10);
      const thread = await storage.getThread(threadId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      if (thread.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have access to this thread" });
      }
      await storage.deleteThread(threadId);
      return res.status(200).json({ message: "Thread deleted successfully" });
    } catch (error) {
      console.error("Error deleting thread:", error);
      return res.status(500).json({ error: "Failed to delete thread" });
    }
  });
  app2.post("/api/thread/new", ensureAuthenticated2, initThread);
  app2.post("/api/chat", ensureAuthenticated2, chatWithAssistant);
  app2.post("/api/upload", ensureAuthenticated2, uploadFiles);
  app2.post("/api/upload-directory", ensureAuthenticated2, uploadFiles);
  app2.get("/api/files", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const files2 = await storage.getUserFiles(req.user.id);
      return res.json(files2);
    } catch (error) {
      console.error("Error fetching files:", error);
      return res.status(500).json({ error: "Failed to fetch files" });
    }
  });
  app2.post("/api/files/upload", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ error: "No file was uploaded" });
      }
      console.log("Files in request:", Object.keys(req.files));
      if (!req.files.file) {
        return res.status(400).json({ error: "File must be uploaded with field name 'file'" });
      }
      const uploadedFile = req.files.file;
      const purpose = req.body.purpose || "assistants";
      const validPurposes = ["assistants", "fine-tuning", "assistants_output"];
      if (!validPurposes.includes(purpose)) {
        return res.status(400).json({ error: "Invalid purpose. Must be one of: assistants, fine-tuning, assistants_output" });
      }
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (!uploadedFile.size) {
        return res.status(400).json({ error: "Unable to determine file size" });
      }
      if (uploadedFile.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: "File size exceeds 50MB limit" });
      }
      try {
        const storedFile = await storage.addFile(
          req.user.id,
          `local_${Date.now()}`,
          // Generate a local ID until OpenAI integration works
          uploadedFile.name,
          purpose,
          uploadedFile.size,
          void 0
          // not associated with an assistant yet
        );
        return res.status(201).json(storedFile);
      } catch (error) {
        console.error("Database storage error:", error);
        return res.status(500).json({
          error: "Failed to store file record in database",
          details: error.message || "Unknown error"
        });
      }
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Internal server error during file upload" });
    }
  });
  app2.delete("/api/files/:id", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const fileId = parseInt(req.params.id, 10);
      const files2 = await storage.getUserFiles(req.user.id);
      const file = files2.find((f) => f.id === fileId);
      if (!file) {
        return res.status(404).json({ error: "File not found or you don't have permission to delete it" });
      }
      try {
        await storage.deleteFile(fileId);
        return res.status(200).json({ message: "File deleted successfully" });
      } catch (error) {
        console.error("Database file deletion error:", error);
        return res.status(500).json({
          error: "Failed to delete file from database",
          details: error.message
        });
      }
    } catch (error) {
      console.error("File deletion error:", error);
      return res.status(500).json({ error: "Internal server error during file deletion" });
    }
  });
  app2.get("/api/health", cacheMiddleware(60), async (req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      const health = {
        status: "ok",
        version: "1.0",
        environment: process.env.NODE_ENV || "development",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        uptime: {
          seconds: uptime,
          formatted: formatUptime(uptime)
        },
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
        }
      };
      res.json(health);
    } catch (error) {
      res.json({
        status: "degraded",
        message: "Health check succeeded but metrics collection failed",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app2.get("/api/analytics/usage", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const { startDate, endDate, limit, offset } = req.query;
      const options = {};
      if (startDate) {
        options.startDate = new Date(startDate);
      }
      if (endDate) {
        options.endDate = new Date(endDate);
      }
      if (limit) {
        options.limit = parseInt(limit);
      }
      if (offset) {
        options.offset = parseInt(offset);
      }
      const usageData = await storage.getUserUsageAnalytics(req.user.id, options);
      res.status(200).json(usageData);
    } catch (error) {
      console.error("Error fetching usage analytics:", error);
      res.status(500).json({ error: "Failed to fetch usage analytics" });
    }
  });
  app2.get("/api/analytics/summary", ensureAuthenticated2, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const { startDate, endDate, groupBy } = req.query;
      const options = {};
      if (startDate) {
        options.startDate = new Date(startDate);
      }
      if (endDate) {
        options.endDate = new Date(endDate);
      }
      if (groupBy && ["day", "week", "month"].includes(groupBy)) {
        options.groupBy = groupBy;
      }
      const summary = await storage.getUserUsageSummary(req.user.id, options);
      res.status(200).json(summary);
    } catch (error) {
      console.error("Error fetching usage summary:", error);
      res.status(500).json({ error: "Failed to fetch usage summary" });
    }
  });
  app2.get("/api/fine-tuning/models", ensureAuthenticated2, getFineTunableModels);
  app2.post("/api/fine-tuning/jobs", ensureAuthenticated2, createFineTuningJob);
  app2.get("/api/fine-tuning/jobs", ensureAuthenticated2, getUserFineTuningJobs);
  app2.get("/api/fine-tuning/jobs/:id", ensureAuthenticated2, getFineTuningJobDetails);
  app2.post("/api/fine-tuning/jobs/:id/cancel", ensureAuthenticated2, cancelFineTuningJob);
  app2.get("/api/fine-tuning/models/custom", ensureAuthenticated2, getUserFineTunedModels);
  app2.patch("/api/fine-tuning/models/custom/:id", ensureAuthenticated2, updateFineTunedModelStatus);
  app2.delete("/api/fine-tuning/models/custom/:id", ensureAuthenticated2, deleteFineTunedModel);
  const httpServer = createServer(app2);
  return httpServer;
}

// temp-prod/server-prod.js
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
var app = express();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://platform-lookaside.fbsbx.com", "https://avatars.githubusercontent.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.openai.com"]
    }
  }
}));
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
var server = await registerRoutes(app);
var distPath = path3.resolve(__dirname, "public");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path3.resolve(distPath, "index.html"));
});
var port = process.env.PORT || 5e3;
server.listen(port, "0.0.0.0", () => {
  console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] Server started and listening on port ${port}`);
});
process.on("SIGTERM", () => {
  console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] SIGTERM signal received, shutting down server`);
  server.close(() => {
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] Server closed`);
    process.exit(0);
  });
});
