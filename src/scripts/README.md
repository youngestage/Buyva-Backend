# Database Scripts

This directory contains scripts for managing the database schema and migrations.

## Available Scripts

### `db-migrate.js`

A CLI tool for managing database migrations.

#### Commands:

- `npm run migrate:create <name>` - Create a new migration file
  ```bash
  npm run migrate:create add_users_table
  ```

- `npm run migrate:up` - Apply all pending migrations
  ```bash
  npm run migrate:up
  ```

### `reset-db.js`

Resets the database to its initial state by dropping all tables and reapplying the schema.

> ⚠️ **Warning**: This will delete all data in your database. Use with caution!

```bash
npm run db:reset
```

## Setting Up a New Environment

1. Create a new Supabase project at [https://app.supabase.com](https://app.supabase.com)
2. Get your project URL and service role key from Project Settings > API
3. Create a `.env` file in the project root with the following variables:
   ```
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
4. Run the initial migration:
   ```bash
   npm run migrate:up
   ```

## Development Workflow

1. Create a new migration for your changes:
   ```bash
   npm run migrate:create descriptive_migration_name
   ```

2. Edit the generated SQL file in `supabase/migrations/`

3. Apply the migration:
   ```bash
   npm run migrate:up
   ```

4. If needed, reset the database (development only):
   ```bash
   npm run db:reset
   ```

## Best Practices

- Always create a new migration for schema changes
- Never modify existing migration files after they've been applied
- Test migrations in a development environment before applying to production
- Keep migrations small and focused on a single change
- Include comments in your SQL to explain the purpose of the migration
