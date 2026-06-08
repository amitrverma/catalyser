import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});

async function ensureMigrationLedger() {
  await client.query(`
    create schema if not exists app_migrations;

    create table if not exists app_migrations.applied_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

async function appliedMigrationNames() {
  const result = await client.query('select name from app_migrations.applied_migrations');
  return new Set(result.rows.map((row) => row.name));
}

async function migrationFiles() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();
}

await client.connect();

try {
  await ensureMigrationLedger();
  const applied = await appliedMigrationNames();
  const files = await migrationFiles();
  const summary = { applied: [], skipped: [] };

  for (const file of files) {
    if (applied.has(file)) {
      summary.skipped.push(file);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into app_migrations.applied_migrations (name) values ($1)', [file]);
      await client.query('commit');
      summary.applied.push(file);
    } catch (error) {
      await client.query('rollback');
      throw new Error(`Failed migration ${file}: ${error.message}`, { cause: error });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await client.end();
}
