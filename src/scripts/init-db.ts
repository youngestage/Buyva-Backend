#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using service role key for migrations

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Execute a SQL query and handle errors
 */
async function executeQuery(sql: string): Promise<void> {
  const { error } = await supabase.rpc('pg_query', {
    query: sql
  });

  if (error) {
    // Skip duplicate object errors (like trying to create existing tables)
    if (!error.message?.includes('already exists') && 
        !error.message?.includes('does not exist')) {
      throw new Error(`Error executing SQL: ${error.message}\nStatement: ${sql}`);
    }
    console.log(`ℹ️  Skipped: ${error.message?.split('\n')[0]}`);
  }
}

/**
 * Initialize the database with required tables and RLS policies
 */
async function initializeDatabase(): Promise<void> {
  console.log('🚀 Initializing database...');

  try {
    // Read the SQL migration file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationPath = join(__dirname, '..', '..', 'supabase', 'migrations', '20240526000000_initial_schema.sql');
    const sql = await readFile(migrationPath, 'utf8');

    // Split the SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    for (const statement of statements) {
      if (statement) { // Skip empty statements
        await executeQuery(statement + ';'); // Add back the semicolon
      }
    }

    console.log('✅ Database initialized successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase().catch(error => {
  console.error('❌ Unhandled error in database initialization:', error);
  process.exit(1);
});
