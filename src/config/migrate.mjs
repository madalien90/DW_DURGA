// src/config/migrate.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    const sqlPath = path.join(__dirname, '../../migrations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migrations...');
    await pool.query(sql);
    console.log('Migrations applied successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();