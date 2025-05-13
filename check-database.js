#!/usr/bin/env node

import { Pool } from 'pg';

// Function to check database connection
async function checkDatabaseConnection() {
  console.log('Testing database connection...');
  
  // Create a database pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Try to connect and run a simple query
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT current_timestamp');
      console.log('Database connection successful!');
      console.log(`Server time: ${result.rows[0].current_timestamp}`);
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection failed!');
    console.error(err.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Run the check
checkDatabaseConnection().then(success => {
  process.exit(success ? 0 : 1);
});