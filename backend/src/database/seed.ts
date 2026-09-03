import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from './db.js';

const currentFilePath = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFilePath), '..', '..');
const seedsDirectory = path.join(backendRoot, 'db', 'seeds');

async function runSeed(fileName: string): Promise<void> {
  const seedPath = path.join(seedsDirectory, fileName);
  const sql = await fs.readFile(seedPath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`Applied seed ${fileName}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function seed(): Promise<void> {
  const seedFileNames = (await fs.readdir(seedsDirectory))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  for (const fileName of seedFileNames) {
    await runSeed(fileName);
  }

  console.log('Database seeds are up to date');
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
