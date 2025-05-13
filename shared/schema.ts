import { pgTable, text, serial, timestamp, varchar, boolean, integer, json, uniqueIndex, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password"), // Can be null for social login users
  name: varchar("name", { length: 255 }),
  picture: varchar("picture", { length: 1024 }),
  role: varchar("role", { length: 50 }).default("user"), // Possible values: user, admin, editor
  openaiKeyHash: varchar("openai_key_hash", { length: 255 }),
  openaiKeyAddedAt: timestamp("openai_key_added_at"), // When the API key was added
  defaultAssistantId: integer("default_assistant_id"),
  resetAt: timestamp("reset_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assistants = pgTable("assistants", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    userIdNameIndex: uniqueIndex("user_id_name_idx").on(table.userId, table.name),
  };
});

export const threads = pgTable("threads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assistantId: integer("assistant_id").references(() => assistants.id, { onDelete: "set null" }),
  openaiThreadId: varchar("openai_thread_id", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).default("New Thread"),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  openaiMessageId: varchar("openai_message_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assistantId: integer("assistant_id").references(() => assistants.id, { onDelete: "set null" }),
  openaiFileId: varchar("openai_file_id", { length: 100 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  purpose: varchar("purpose", { length: 50 }).notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const oauthProfiles = pgTable("oauth_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(),
  providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("session", {
  sid: varchar("sid", { length: 255 }).notNull().primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 255 }).notNull().references(() => sessions.sid, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  lastActive: timestamp("last_active").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usageAnalytics = pgTable("usage_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assistantId: integer("assistant_id").references(() => assistants.id, { onDelete: "set null" }),
  threadId: integer("thread_id").references(() => threads.id, { onDelete: "set null" }),
  modelId: varchar("model_id", { length: 50 }).notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedCost: doublePrecision("estimated_cost").notNull().default(0),
  requestType: varchar("request_type", { length: 50 }).notNull().default("chat"), // chat, completion, embedding, etc.
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fineTuningJobs = pgTable("fine_tuning_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  openaiJobId: varchar("openai_job_id", { length: 100 }),
  name: varchar("name", { length: 100 }).notNull(),
  baseModel: varchar("base_model", { length: 50 }).notNull(),
  trainingFileId: integer("training_file_id").references(() => files.id),
  validationFileId: integer("validation_file_id").references(() => files.id),
  fineTunedModelName: varchar("fine_tuned_model_name", { length: 100 }),
  hyperparameters: json("hyperparameters"),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, running, succeeded, failed, cancelled
  trainedTokens: integer("trained_tokens"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const fineTunedModels = pgTable("fine_tuned_models", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: integer("job_id").references(() => fineTuningJobs.id, { onDelete: "set null" }),
  openaiModelId: varchar("openai_model_id", { length: 100 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  baseModel: varchar("base_model", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  theme: varchar("theme", { length: 50 }).default("dark"), // light, dark, system
  customColors: boolean("custom_colors").default(false),
  backgroundColor: varchar("background_color", { length: 50 }),
  foregroundColor: varchar("foreground_color", { length: 50 }),
  primaryColor: varchar("primary_color", { length: 50 }),
  accentColor: varchar("accent_color", { length: 50 }),
  cardColor: varchar("card_color", { length: 50 }),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  soundEnabled: boolean("sound_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemas for inserts and validation

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  picture: true,
}).partial({
  password: true,
  name: true,
  picture: true,
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  userId: z.number().int().positive("Invalid user ID"),
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
});

export const assistantSchema = createInsertSchema(assistants, {
  id: undefined,
  createdAt: undefined,
  updatedAt: undefined
});

export const updateAssistantSchema = assistantSchema.partial();

export const apiKeySchema = z.object({
  apiKey: z.string().min(1, "API Key is required")
});

export const usageAnalyticsSchema = createInsertSchema(usageAnalytics, {
  id: undefined,
  createdAt: undefined
});

export const userPreferencesSchema = createInsertSchema(userPreferences, {
  id: undefined,
  createdAt: undefined,
  updatedAt: undefined
});

export const updateUserPreferencesSchema = userPreferencesSchema.partial().omit({ userId: true });

// Create schemas for fine-tuning
export const fineTuningJobSchema = createInsertSchema(fineTuningJobs, {
  id: undefined,
  openaiJobId: undefined,
  status: undefined,
  trainedTokens: undefined,
  error: undefined,
  createdAt: undefined,
  updatedAt: undefined,
  fineTunedModelName: undefined
});

export const updateFineTuningJobSchema = fineTuningJobSchema.partial();

export const fineTunedModelSchema = createInsertSchema(fineTunedModels, {
  id: undefined,
  createdAt: undefined
});

// Types

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type InsertAssistant = z.infer<typeof assistantSchema>;
export type UpdateAssistant = z.infer<typeof updateAssistantSchema>;
export type ApiKeyUpdate = z.infer<typeof apiKeySchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type InsertUsageAnalytic = z.infer<typeof usageAnalyticsSchema>;
export type InsertUserPreferences = z.infer<typeof userPreferencesSchema>;
export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;
export type InsertFineTuningJob = z.infer<typeof fineTuningJobSchema>;
export type UpdateFineTuningJob = z.infer<typeof updateFineTuningJobSchema>;
export type InsertFineTunedModel = z.infer<typeof fineTunedModelSchema>;

export type User = typeof users.$inferSelect;
export type Assistant = typeof assistants.$inferSelect;
export type Thread = typeof threads.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type File = typeof files.$inferSelect;
export type OAuthProfile = typeof oauthProfiles.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type UsageAnalytic = typeof usageAnalytics.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type FineTuningJob = typeof fineTuningJobs.$inferSelect;
export type FineTunedModel = typeof fineTunedModels.$inferSelect;
