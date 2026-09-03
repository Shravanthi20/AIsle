import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from './db.js';

const currentFilePath = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFilePath), '..', '..');
const migrationsDirectory = path.join(backendRoot, 'db', 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id bigserial PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      executed_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrationIds(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row) => row.filename));
}

async function runMigration(fileName: string): Promise<void> {
  const migrationPath = path.join(migrationsDirectory, fileName);
  const sql = await fs.readFile(migrationPath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [fileName]);
    await client.query('COMMIT');
    console.log(`Applied migration ${fileName}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function migrate(): Promise<void> {
  await ensureMigrationsTable();

  const appliedMigrationIds = await getAppliedMigrationIds();
  const migrationFileNames = (await fs.readdir(migrationsDirectory))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  for (const fileName of migrationFileNames) {
    if (!appliedMigrationIds.has(fileName)) {
      await runMigration(fileName);
    }
  }

  console.log('Database migrations are up to date');
}

migrate()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
