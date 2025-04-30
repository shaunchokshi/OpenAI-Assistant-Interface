import { z } from 'zod';

// API Key validation
export const apiKeySchema = z.object({
  apiKey: z.string()
    .min(1, "API Key is required")
    .regex(/^sk-[A-Za-z0-9]{32,}$/, "Invalid API Key format - should start with 'sk-' followed by at least 32 characters"),
});

// Assistant creation validation
export const createAssistantSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  description: z.string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  model: z.string()
    .min(1, "Model is required"),
  temperature: z.number()
    .min(0, "Temperature must be at least 0")
    .max(1, "Temperature cannot exceed 1"),
  instructions: z.string()
    .max(1500, "Instructions cannot exceed 1500 characters")
    .optional(),
});

// Thread creation validation
export const createThreadSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters"),
  assistantId: z.number().optional(),
});

// Message validation
export const sendMessageSchema = z.object({
  threadId: z.number(),
  message: z.string()
    .min(1, "Message is required")
    .max(10000, "Message cannot exceed 10000 characters"),
});