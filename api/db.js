import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'db', 'agentboard.db');
const SCHEMA_PATH = join(__dirname, '..', 'db', 'schema.sql');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
const schema = readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

// Migrations
try {
  db.exec(`ALTER TABLE agents ADD COLUMN approved_via TEXT NOT NULL DEFAULT 'manual'`);
} catch (err) {
  // Column already exists — ignore
}

export default db;
