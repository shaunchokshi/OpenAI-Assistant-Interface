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
    
    // Validate the assistant ID format
    if (typeof assistantId !== 'string' || !assistantId.startsWith('asst_')) {
      logger.error(`Invalid assistant ID: ${assistantId}. Expected an ID that begins with 'asst_'`);
      return res.status(400).json({ 
        error: "Invalid assistant ID",
        details: "Expected an ID that begins with 'asst_'"
      });
    }
    
    try {
      // Create OpenAI client with the temporary API key provided
      const openai = new OpenAI({ apiKey });
      
      // Fetch the specific assistant from OpenAI
      const openaiAssistant = await openai.beta.assistants.retrieve(assistantId);
      
      // Log the entire assistant object to see its structure
      logger.info(`Single assistant object structure: ${JSON.stringify(openaiAssistant)}`);
      
      // Extract file_ids from the OpenAI assistant (if exists)
      // @ts-ignore - The OpenAI API does have file_ids but TypeScript may not recognize it
      const fileIds = openaiAssistant.file_ids || [];
      
      // Log the file IDs we found
      logger.info(`File IDs for single assistant ${assistantId}: ${JSON.stringify(fileIds)}`);
      
      // Ensure fileIds is properly formatted as a string array
      const processedFileIds = Array.isArray(fileIds) ? fileIds : [];
      
      // Prepare assistant data using the schema to ensure it's valid
      const assistantData = assistantSchema.parse({
        name: openaiAssistant.name || "Imported Assistant",
        description: openaiAssistant.description || null,
        openaiAssistantId: openaiAssistant.id,
        model: openaiAssistant.model,
        instructions: openaiAssistant.instructions || null,
        temperature: 0.7, // Default
        fileIds: processedFileIds
      });
      
      // Create the assistant in our database
      // Workaround for TypeScript not recognizing userId (it's not in the schema but used internally)
      const createData = { ...assistantData } as any;
      createData.userId = req.user.id;
      
      try {
        // Try to insert into the database
        logger.info(`Creating single assistant in database with userId: ${req.user.id}`);
        const assistant = await storage.createAssistant(createData);
        
        logger.info(`Successfully imported single assistant ${assistantId}`);
        return res.status(201).json(assistant);
      } catch (dbError: any) {
        // Log database insertion errors
        logger.error(`Database error inserting single assistant ${assistantId}: ${dbError.message}`, dbError);
        return res.status(500).json({ 
          error: "Failed to import assistant to database",
          details: dbError.message
        });
      }
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
        // Skip null, undefined or invalid assistant IDs
        if (!assistantId || typeof assistantId !== 'string' || !assistantId.startsWith('asst_')) {
          logger.error(`Invalid assistant ID: ${assistantId}. Expected an ID that begins with 'asst_'`);
          errors.push({
            assistantId: assistantId || 'null',
            error: "Invalid assistant ID. Expected an ID that begins with 'asst_'"
          });
          continue;
        }
        
        try {
          // Fetch the specific assistant from OpenAI
          const openaiAssistant = await openai.beta.assistants.retrieve(assistantId);
          
          // Log the entire assistant object to see its structure
          logger.info(`Assistant object structure: ${JSON.stringify(openaiAssistant)}`);
          
          // According to OpenAI API docs, the property should be "file_ids"
          // TypeScript doesn't recognize it because it's not in the type definition
          // @ts-ignore
          const fileIds = openaiAssistant.file_ids || [];
          
          // Log the file IDs we found
          logger.info(`File IDs for assistant ${assistantId}: ${JSON.stringify(fileIds)}`);
          
          logger.info(`Importing assistant ${assistantId}: ${openaiAssistant.name || "Unnamed"}`);
          
          try {
            // Ensure fileIds is properly formatted as a string array
            const processedFileIds = Array.isArray(fileIds) ? fileIds : [];
            
            // Prepare assistant data using the schema to ensure it's valid
            const assistantData = assistantSchema.parse({
              name: openaiAssistant.name || "Imported Assistant",
              description: openaiAssistant.description || null,
              openaiAssistantId: openaiAssistant.id,
              model: openaiAssistant.model,
              instructions: openaiAssistant.instructions || null,
              temperature: 0.7, // Default
              fileIds: processedFileIds
            });
            
            logger.info(`Parsed assistant data for ${assistantId}`, assistantData);
            
            // Create the assistant in our database
            // Workaround for TypeScript not recognizing userId (it's not in the schema but used internally)
            const createData = { ...assistantData } as any;
            createData.userId = req.user.id;
            
            logger.info(`Creating assistant in database with userId: ${req.user.id}`);
            
            try {
              // Try to insert into the database
              const assistant = await storage.createAssistant(createData);
              
              importedAssistants.push(assistant);
              logger.info(`Successfully imported assistant ${assistantId}`);
            } catch (dbError: any) {
              // Log database insertion errors
              logger.error(`Database error inserting assistant ${assistantId}: ${dbError.message}`, dbError);
              errors.push({
                assistantId,
                error: `Database error: ${dbError.message}`
              });
            }
          } catch (parseErr: any) {
            logger.error(`Error parsing assistant data: ${parseErr.message}`, parseErr);
            errors.push({
              assistantId,
              error: `Data validation error: ${parseErr.message}`
            });
          }
        } catch (err: any) {
          logger.error(`Error retrieving assistant ${assistantId} from OpenAI: ${err.message}`, err);
          errors.push({
            assistantId,
            error: err.message
          });
        }
      }
      
      // Log the final results for debugging
      logger.info(`Import results: ${importedAssistants.length} imported, ${errors.length} failed`);
      if (errors.length > 0) {
        logger.info(`Import errors: ${JSON.stringify(errors)}`);
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