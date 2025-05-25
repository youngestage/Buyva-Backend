#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requires service role key

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase URL or Service Role Key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'supabase', 'migrations', '20240524140000_initial_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Initial schema file not found. Run migrations first.');
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Drop all tables (be careful with this in production!)
    console.log('🧹 Dropping existing tables...');
    await supabase.rpc('exec_sql', { 
      sql: `
        DROP TABLE IF EXISTS _migrations CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TYPE IF EXISTS user_role CASCADE;
      ` 
    });
    
    // Recreate the schema
    console.log('🏗️  Recreating schema...');
    await supabase.rpc('exec_sql', { sql: schema });
    
    // Recreate the migrations table
    await supabase.rpc('exec_sql', { 
      sql: `
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      ` 
    });
    
    // Record the initial migration
    await supabase
      .from('_migrations')
      .insert([{ 
        name: '20240524140000_initial_schema.sql', 
        applied_at: new Date().toISOString() 
      }]);
    
    console.log('✅ Database reset successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    process.exit(1);
  }
}

resetDatabase();
