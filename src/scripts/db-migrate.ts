#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requires service role key for migrations

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

interface Migration {
  id: number;
  name: string;
  applied_at: string;
}

const program = new Command();

program
  .name('db-migrate')
  .description('CLI to manage database migrations')
  .version('1.0.0');

// Create a new migration
program
  .command('create <name>')
  .description('Create a new migration file')
  .action((name: string) => {
    try {
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
      const fileName = `${timestamp}_${name.replace(/[^a-zA-Z0-9]/g, '_')}.sql`;
      const filePath = path.join('supabase', 'migrations', fileName);
      
      // Ensure migrations directory exists
      if (!fs.existsSync('supabase/migrations')) {
        fs.mkdirSync('supabase/migrations', { recursive: true });
      }
      
      // Create migration file with template
      const template = `-- Migration: ${name}\n-- Created at: ${new Date().toISOString()}\n\n-- Your SQL goes here`;
      fs.writeFileSync(filePath, template);
      
      console.log(`✅ Created migration: ${filePath}`);
    } catch (error: any) {
      console.error('❌ Failed to create migration:', error.message);
      process.exit(1);
    }
  });

// Run all pending migrations
program
  .command('up')
  .description('Run all pending migrations')
  .action(async () => {
    try {
      console.log('🚀 Running migrations...');
      
      // Get all migration files
      const migrationDir = path.join('supabase', 'migrations');
      if (!fs.existsSync(migrationDir)) {
        console.log('No migrations directory found. Creating...');
        fs.mkdirSync(migrationDir, { recursive: true });
        console.log('✅ Created migrations directory');
        return;
      }
      
      const files = fs.readdirSync(migrationDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      if (files.length === 0) {
        console.log('No migration files found.');
        return;
      }
      
      // Check migrations table
      await ensureMigrationsTable();
      
      // Get applied migrations
      const { data: appliedMigrations, error: fetchError } = await supabase
        .from('_migrations')
        .select('name')
        .order('applied_at', { ascending: true }) as { data: Migration[] | null; error: any };
      
      if (fetchError) {
        throw new Error(`Failed to fetch migrations: ${fetchError.message}`);
      }
      
      const appliedSet = new Set(appliedMigrations?.map(m => m.name) || []);
      
      // Apply pending migrations
      for (const file of files) {
        if (!appliedSet.has(file)) {
          console.log(`🔄 Applying migration: ${file}`);
          
          try {
            const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
            const { error: execError } = await supabase.rpc('exec_sql', { sql });
            
            if (execError) {
              throw new Error(`SQL execution failed: ${execError.message}`);
            }
            
            // Record migration
            const { error: insertError } = await supabase
              .from('_migrations')
              .insert([{ name: file, applied_at: new Date().toISOString() }]);
              
            if (insertError) {
              throw new Error(`Failed to record migration: ${insertError.message}`);
            }
              
            console.log(`✅ Applied migration: ${file}`);
          } catch (error: any) {
            console.error(`❌ Failed to apply migration ${file}:`, error.message);
            process.exit(1);
          }
        }
      }
      
      console.log('✨ All migrations applied successfully!');
    } catch (error: any) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  });

// Helper function to ensure migrations table exists
async function ensureMigrationsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
  if (error) {
    throw new Error(`Failed to create migrations table: ${error.message}`);
  }
}

// Show help if no arguments
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv);
