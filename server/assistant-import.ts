import OpenAI from "openai";
import { Request, Response } from "express";
import { storage } from "./storage";
import { User, Assistant, InsertAssistant, assistantSchema } from "@shared/schema";
import { logger } from "./logger";
import { validateUserApiKey } from "./openai";

/**
 * Fetch assistants from OpenAI API
 * Allows importing existing assistants from a user's OpenAI account
 */
export async function fetchOpenAIAssistants(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Get the user to access their API key
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if user has an API key
    const apiKeyError = validateUserApiKey(user);
    if (apiKeyError) {
      return res.status(400).json(apiKeyError);
    }
    
    // Security note: We don't store the actual API key, only a hash
    // We need to ask the user to provide their API key for this specific operation
    if (!req.body.apiKey) {
      return res.status(400).json({ 
        error: "For security reasons, we can't access your original API key. Please provide your OpenAI API key in the request to import assistants."
      });
    }
    
    try {
      // Create OpenAI client with the temporary API key provided
      const openai = new OpenAI({ apiKey: req.body.apiKey });
      
      // Fetch assistants from OpenAI
      const assistantsList = await openai.beta.assistants.list({
        limit: 100,
      });
      
      // Transform to our data format
      const assistants = assistantsList.data.map(assistant => ({
        name: assistant.name || "Unnamed Assistant",
        description: assistant.description || null,
        openaiAssistantId: assistant.id,
        model: assistant.model,
        instructions: assistant.instructions || null,
        temperature: 0.7, // Default as OpenAI doesn't store this
        // Fields like userId and file_ids will be handled by the createAssistant method
      }));
      
      return res.json(assistants);
    } catch (error: any) {
      logger.error("Error fetching OpenAI assistants:", error);
      return res.status(500).json({ 
        error: "Failed to fetch assistants from OpenAI",
        details: error.message
      });
    }
  } catch (error: any) {
    logger.error("Error in fetchOpenAIAssistants:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Import an assistant from OpenAI to our database
 */
export async function importOpenAIAssistant(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const { assistantId, apiKey } = req.body;
    
    if (!assistantId || !apiKey) {
      return res.status(400).json({ error: "Assistant ID and API key are required" });
    }
    
    try {
      // Create OpenAI client with the temporary API key provided
      const openai = new OpenAI({ apiKey });
      
      // Fetch the specific assistant from OpenAI
      const openaiAssistant = await openai.beta.assistants.retrieve(assistantId);
      
      // Extract file_ids from the OpenAI assistant (if exists)
      // @ts-ignore - The OpenAI API does have file_ids but TypeScript may not recognize it
      const fileIds = openaiAssistant.file_ids || [];
      
      // Prepare assistant data using the schema to ensure it's valid
      const assistantData = assistantSchema.parse({
        name: openaiAssistant.name || "Imported Assistant",
        description: openaiAssistant.description || null,
        openaiAssistantId: openaiAssistant.id,
        model: openaiAssistant.model,
        instructions: openaiAssistant.instructions || null,
        temperature: 0.7, // Default
        fileIds: fileIds
      });
      
      // Create the assistant in our database
      // Workaround for TypeScript not recognizing userId (it's not in the schema but used internally)
      const createData = { ...assistantData } as any;
      createData.userId = req.user.id;
      const assistant = await storage.createAssistant(createData);
      
      return res.status(201).json(assistant);
    } catch (error: any) {
      logger.error("Error importing OpenAI assistant:", error);
      return res.status(500).json({ 
        error: "Failed to import assistant from OpenAI",
        details: error.message
      });
    }
  } catch (error: any) {
    logger.error("Error in importOpenAIAssistant:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Import multiple assistants from OpenAI to our database
 */
export async function importMultipleAssistants(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const { assistantIds, apiKey } = req.body;
    
    if (!Array.isArray(assistantIds) || assistantIds.length === 0 || !apiKey) {
      return res.status(400).json({ error: "Assistant IDs array and API key are required" });
    }
    
    try {
      // Create OpenAI client with the temporary API key provided
      const openai = new OpenAI({ apiKey });
      
      const importedAssistants = [];
      const errors = [];
      
      // Import each assistant
      for (const assistantId of assistantIds) {
        try {
          // Fetch the specific assistant from OpenAI
          const openaiAssistant = await openai.beta.assistants.retrieve(assistantId);
          
          // Extract file_ids from the OpenAI assistant (if exists)
          // @ts-ignore - The OpenAI API does have file_ids but TypeScript may not recognize it
          const fileIds = openaiAssistant.file_ids || [];
          
          // Prepare assistant data using the schema to ensure it's valid
          const assistantData = assistantSchema.parse({
            name: openaiAssistant.name || "Imported Assistant",
            description: openaiAssistant.description || null,
            openaiAssistantId: openaiAssistant.id,
            model: openaiAssistant.model,
            instructions: openaiAssistant.instructions || null,
            temperature: 0.7, // Default
            fileIds: fileIds
          });
          
          // Create the assistant in our database
          // Workaround for TypeScript not recognizing userId (it's not in the schema but used internally)
          const createData = { ...assistantData } as any;
          createData.userId = req.user.id;
          const assistant = await storage.createAssistant(createData);
          
          importedAssistants.push(assistant);
        } catch (err: any) {
          errors.push({
            assistantId,
            error: err.message
          });
        }
      }
      
      return res.status(200).json({
        success: importedAssistants.length > 0,
        imported: importedAssistants,
        failed: errors,
        message: `Successfully imported ${importedAssistants.length} of ${assistantIds.length} assistants`
      });
    } catch (error: any) {
      logger.error("Error importing multiple OpenAI assistants:", error);
      return res.status(500).json({ 
        error: "Failed to import assistants from OpenAI",
        details: error.message
      });
    }
  } catch (error: any) {
    logger.error("Error in importMultipleAssistants:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}