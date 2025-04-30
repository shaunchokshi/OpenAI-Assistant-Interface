import { InsertUsageAnalytic } from "@shared/schema";
import { storage } from "./storage";

// Define costs for different models per 1K tokens
// These are approximate costs and might need updates as OpenAI changes pricing
interface ModelCost {
  input: number;   // Cost per 1K input tokens in USD
  output: number;  // Cost per 1K output tokens in USD
}

const MODEL_COSTS: Record<string, ModelCost> = {
  // GPT-4 models
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-4-32k": { input: 0.06, output: 0.12 },
  
  // GPT-3.5 models
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  "gpt-3.5-turbo-16k": { input: 0.001, output: 0.002 },
  
  // Default cost for unknown models
  "default": { input: 0.01, output: 0.03 }
};

/**
 * Calculate the estimated cost for token usage
 * @param model The OpenAI model used for the request
 * @param promptTokens Number of input/prompt tokens
 * @param completionTokens Number of output/completion tokens
 * @returns Estimated cost in USD
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const modelCost = MODEL_COSTS[model] || MODEL_COSTS.default;
  
  // Convert tokens to thousands for calculation
  const promptTokensK = promptTokens / 1000;
  const completionTokensK = completionTokens / 1000;
  
  // Calculate costs
  const promptCost = promptTokensK * modelCost.input;
  const completionCost = completionTokensK * modelCost.output;
  
  // Return total cost with 6 decimal precision
  return parseFloat((promptCost + completionCost).toFixed(6));
}

/**
 * Track API usage for analytics and cost monitoring
 * @param userId The user ID for whom to track usage
 * @param requestType The type of request (chat, completion, embedding, etc.)
 * @param modelId The OpenAI model ID used
 * @param promptTokens Number of input/prompt tokens
 * @param completionTokens Number of output/completion tokens
 * @param assistantId Optional assistant ID if request is associated with an assistant
 * @param threadId Optional thread ID if request is associated with a thread
 * @param success Whether the request was successful
 * @param errorMessage Optional error message if the request failed
 * @param metadata Optional additional metadata about the request
 * @returns The created usage analytics record
 */
export async function trackApiUsage(
  userId: number,
  requestType: string,
  modelId: string,
  promptTokens: number,
  completionTokens: number,
  assistantId?: number,
  threadId?: number,
  success: boolean = true,
  errorMessage?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = calculateCost(modelId, promptTokens, completionTokens);
    
    const usageData: InsertUsageAnalytic = {
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
    console.error('Failed to track API usage:', error);
    // Don't throw errors from analytics to prevent affecting main functionality
  }
}

/**
 * Extract token usage from OpenAI API response
 * @param response The OpenAI API response object
 * @returns An object containing prompt tokens, completion tokens, and total tokens
 */
export function extractTokenUsage(response: any): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  // Handle different response formats from different OpenAI endpoints
  if (response?.usage) {
    const { prompt_tokens = 0, completion_tokens = 0, total_tokens = 0 } = response.usage;
    return {
      promptTokens: prompt_tokens,
      completionTokens: completion_tokens,
      totalTokens: total_tokens
    };
  }
  
  // For assistants API which may have different structure
  if (response?.usage_statistics?.prompt_tokens && response?.usage_statistics?.completion_tokens) {
    const { prompt_tokens = 0, completion_tokens = 0 } = response.usage_statistics;
    return {
      promptTokens: prompt_tokens,
      completionTokens: completion_tokens,
      totalTokens: prompt_tokens + completion_tokens
    };
  }
  
  // If no usage information is available
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };
}