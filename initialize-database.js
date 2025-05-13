#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import { Pool } from 'pg';
import { logger } from './dist/server/logger.js';

// Promisify exec for cleaner async usage
const execAsync = promisify(exec);

// Function to check if database tables exist
async function checkTablesExist() {
  logger.info('Checking if database tables exist...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    const client = await pool.connect();
    try {
      // Query to check if the users table exists
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        )
      `);
      
      const tablesExist = result.rows[0].exists;
      logger.info(`Database tables ${tablesExist ? 'exist' : 'do not exist'}`);
      return tablesExist;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Error checking database tables:', err.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Function to initialize database
async function initializeDatabase() {
  try {
    // First, check database connection
    logger.info('Running database connection check...');
    await execAsync('node check-database.js');
    logger.info('Database connection check passed');

    // Check if tables already exist
    const tablesExist = await checkTablesExist();
    
    if (!tablesExist) {
      // Run database migration to create tables
      logger.info('Running database migration to create tables...');
      const { stdout, stderr } = await execAsync('npx drizzle-kit push');
      logger.info('Database migration output:');
      logger.info(stdout);
      
      if (stderr) {
        logger.warn('Database migration stderr:', stderr);
      }
      
      logger.info('Database tables created successfully');
    } else {
      logger.info('Database tables already exist, skipping migration');
    }

    return true;
  } catch (err) {
    logger.error('Database initialization failed:', err.message);
    return false;
  }
}

// Execute the initialization
initializeDatabase()
  .then(success => {
    if (success) {
      logger.info('Database initialization completed successfully');
    } else {
      logger.error('Database initialization failed');
      process.exit(1);
    }
  })
  .catch(err => {
    logger.error('Unexpected error during database initialization:', err);
    process.exit(1);
  });