import { pgTable, text, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  apiKeyHash: varchar("api_key_hash", { length: 255 }),
  assistantId: varchar("assistant_id", { length: 100 }),
  resetAt: timestamp("reset_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const oauthProfiles = pgTable("oauth_profiles", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id, { onDelete: "cascade" }),
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

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type OAuthProfile = typeof oauthProfiles.$inferSelect;
export type Session = typeof sessions.$inferSelect;
