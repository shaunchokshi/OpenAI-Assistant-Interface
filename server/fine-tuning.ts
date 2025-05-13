import OpenAI from 'openai';
import { Request, Response } from 'express';
import { storage } from './storage';
import { trackApiUsage } from './analytics';
import { InsertFineTuningJob, InsertFineTunedModel } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Create a client using the app's admin API key if available
// Only create the client if the API key is set, otherwise it will throw an error
let openai: OpenAI | undefined;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  } else {
    console.warn('OPENAI_API_KEY not set. Fine-tuning features will be disabled.');
  }
} catch (error) {
  console.error('Error initializing OpenAI client:', error);
}

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024
// List of models that can be fine-tuned (at the time of implementation)
const MODELS_INFO: Record<string, {
  description: string;
  context_length: number;
  training_cost_per_1k: number;
  input_cost_per_1k: number;
  output_cost_per_1k: number;
}> = {
  'gpt-3.5-turbo': {
    description: 'Most capable GPT-3.5 model optimized for chat at 1/10th the cost of gpt-4.',
    context_length: 16385,
    training_cost_per_1k: 0.008,
    input_cost_per_1k: 0.0015,
    output_cost_per_1k: 0.002
  },
  'babbage-002': {
    description: 'Lightweight model optimized for classification, semantic search, and generally tasks that do not require long outputs.',
    context_length: 16384,
    training_cost_per_1k: 0.0004,
    input_cost_per_1k: 0.0004,
    output_cost_per_1k: 0.0004
  },
  'davinci-002': {
    description: 'Most capable second-generation model, optimized for complex tasks.',
    context_length: 16384,
    training_cost_per_1k: 0.003,
    input_cost_per_1k: 0.003,
    output_cost_per_1k: 0.003
  }
};

/**
 * Get information about available fine-tunable models
 * @returns List of models and their details
 */
export async function getFineTunableModels(req: Request, res: Response) {
  try {
    return res.status(200).json(MODELS_INFO);
  } catch (error) {
    console.error('Error fetching fine-tunable models:', error);
    return res.status(500).json({ error: 'Failed to fetch fine-tunable models' });
  }
}

/**
 * Create a new fine-tuning job
 */
export async function createFineTuningJob(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { name, baseModel, trainingFileId, validationFileId, hyperparameters } = req.body;

    // Validate required fields
    if (!name || !baseModel || !trainingFileId) {
      return res.status(400).json({ error: 'Missing required fields: name, baseModel, trainingFileId' });
    }

    // Check if the model is supported for fine-tuning
    if (!MODELS_INFO[baseModel]) {
      return res.status(400).json({ error: `Model ${baseModel} is not supported for fine-tuning` });
    }

    // Get file details from database
    const trainingFile = await storage.getFile(trainingFileId);
    if (!trainingFile) {
      return res.status(404).json({ error: 'Training file not found' });
    }

    let validationFile = null;
    if (validationFileId) {
      validationFile = await storage.getFile(validationFileId);
      if (!validationFile) {
        return res.status(404).json({ error: 'Validation file not found' });
      }
    }

    // Check if OpenAI client is available
    if (!openai) {
      return res.status(503).json({ 
        error: 'Fine-tuning service unavailable',
        details: 'OpenAI API key not configured'
      });
    }
    
    // Create the job in OpenAI
    const openaiJob = await openai.fineTuning.jobs.create({
      training_file: trainingFile.openaiFileId,
      validation_file: validationFile?.openaiFileId,
      model: baseModel,
      hyperparameters: hyperparameters || undefined
    });

    // Log the API usage
    await trackApiUsage(
      req.user.id,
      'fine-tuning',
      baseModel,
      0, // promptTokens
      0, // completionTokens
      undefined, // assistantId
      undefined, // threadId
      true, // success
      undefined, // errorMessage
      { // metadata
        jobId: openaiJob.id,
        trainingFile: trainingFile.filename,
        validationFile: validationFile?.filename
      }
    );

    // Store the job in our database
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
  } catch (error: any) {
    console.error('Error creating fine-tuning job:', error);
    return res.status(500).json({ 
      error: 'Failed to create fine-tuning job', 
      details: error.message || 'Unknown error occurred'
    });
  }
}

/**
 * Get fine-tuning jobs for the current user
 */
export async function getUserFineTuningJobs(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const jobs = await storage.getUserFineTuningJobs(req.user.id);
    return res.status(200).json(jobs);
  } catch (error) {
    console.error('Error fetching fine-tuning jobs:', error);
    return res.status(500).json({ error: 'Failed to fetch fine-tuning jobs' });
  }
}

/**
 * Get details for a specific fine-tuning job
 */
export async function getFineTuningJobDetails(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const job = await storage.getFineTuningJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Fine-tuning job not found' });
    }

    if (job.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to access this job' });
    }

    // If the job has an OpenAI ID, fetch the latest status
    if (job.openaiJobId && openai) {
      try {
        const openaiJob = await openai.fineTuning.jobs.retrieve(job.openaiJobId);
        
        // Update job status if it has changed
        if (job.status !== openaiJob.status) {
          await storage.updateFineTuningJob(job.id, {
            status: openaiJob.status,
            trainedTokens: openaiJob.trained_tokens || 0,
            fineTunedModelName: openaiJob.fine_tuned_model,
            error: openaiJob.error?.message || null
          });
          
          // If the job is completed successfully, add the fine-tuned model to our database
          if (openaiJob.status === 'succeeded' && openaiJob.fine_tuned_model) {
            const existingModel = await storage.getFineTunedModelByOpenAIId(openaiJob.fine_tuned_model);
            
            if (!existingModel) {
              await storage.createFineTunedModel({
                userId: req.user.id,
                jobId: job.id,
                openaiModelId: openaiJob.fine_tuned_model,
                name: `${job.name} (${new Date().toISOString().split('T')[0]})`,
                baseModel: job.baseModel,
                isActive: true
              });
            }
          }
          
          // Refresh the job data
          const updatedJob = await storage.getFineTuningJob(jobId);
          return res.status(200).json(updatedJob);
        }
      } catch (openaiError) {
        console.error('Error fetching job from OpenAI:', openaiError);
        // Return the local job data even if OpenAI fetch fails
      }
    }

    return res.status(200).json(job);
  } catch (error) {
    console.error('Error fetching fine-tuning job details:', error);
    return res.status(500).json({ error: 'Failed to fetch fine-tuning job details' });
  }
}

/**
 * Cancel a fine-tuning job
 */
export async function cancelFineTuningJob(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const job = await storage.getFineTuningJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Fine-tuning job not found' });
    }

    if (job.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to cancel this job' });
    }

    // Can only cancel jobs that are not already completed or cancelled
    if (['succeeded', 'failed', 'cancelled'].includes(job.status)) {
      return res.status(400).json({ error: `Job cannot be cancelled (status: ${job.status})` });
    }

    if (!job.openaiJobId) {
      return res.status(400).json({ error: 'Job has no OpenAI ID' });
    }

    // Cancel the job in OpenAI if client is available
    if (openai) {
      try {
        await openai.fineTuning.jobs.cancel(job.openaiJobId);
      } catch (openaiError) {
        console.error('Error cancelling job in OpenAI:', openaiError);
        // Continue with local cancellation even if OpenAI fails
      }
    } else {
      console.warn('OpenAI client not available, skipping API cancellation');
    }

    // Update job status in our database
    await storage.updateFineTuningJob(job.id, {
      status: 'cancelled',
      updatedAt: new Date()
    });

    const updatedJob = await storage.getFineTuningJob(jobId);
    return res.status(200).json(updatedJob);
  } catch (error) {
    console.error('Error cancelling fine-tuning job:', error);
    return res.status(500).json({ error: 'Failed to cancel fine-tuning job' });
  }
}

/**
 * Get fine-tuned models for the current user
 */
export async function getUserFineTunedModels(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const models = await storage.getUserFineTunedModels(req.user.id);
    return res.status(200).json(models);
  } catch (error) {
    console.error('Error fetching fine-tuned models:', error);
    return res.status(500).json({ error: 'Failed to fetch fine-tuned models' });
  }
}

/**
 * Update fine-tuned model status (active/inactive)
 */
export async function updateFineTunedModelStatus(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const modelId = parseInt(req.params.id);
    if (isNaN(modelId)) {
      return res.status(400).json({ error: 'Invalid model ID' });
    }

    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const model = await storage.getFineTunedModel(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Fine-tuned model not found' });
    }

    if (model.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this model' });
    }

    await storage.updateFineTunedModelStatus(modelId, isActive);
    
    const updatedModel = await storage.getFineTunedModel(modelId);
    return res.status(200).json(updatedModel);
  } catch (error) {
    console.error('Error updating fine-tuned model status:', error);
    return res.status(500).json({ error: 'Failed to update fine-tuned model status' });
  }
}

/**
 * Delete a fine-tuned model (marks as inactive, doesn't delete from OpenAI)
 */
export async function deleteFineTunedModel(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const modelId = parseInt(req.params.id);
    if (isNaN(modelId)) {
      return res.status(400).json({ error: 'Invalid model ID' });
    }

    const model = await storage.getFineTunedModel(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Fine-tuned model not found' });
    }

    if (model.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this model' });
    }

    // We don't actually delete from OpenAI, just mark as inactive in our database
    await storage.updateFineTunedModelStatus(modelId, false);
    
    return res.status(200).json({ message: 'Model marked as inactive' });
  } catch (error) {
    console.error('Error deleting fine-tuned model:', error);
    return res.status(500).json({ error: 'Failed to delete fine-tuned model' });
  }
}