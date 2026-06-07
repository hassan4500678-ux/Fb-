import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../db/schema.sql');

try {
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('PostgreSQL schema migrated successfully.');
} finally {
  await pool.end();
}
