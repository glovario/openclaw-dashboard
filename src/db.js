const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'dashboard.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    title                   TEXT NOT NULL,
    description             TEXT DEFAULT '',
    status                  TEXT NOT NULL DEFAULT 'backlog',
    owner                   TEXT NOT NULL DEFAULT 'matt',
    priority                TEXT NOT NULL DEFAULT 'medium',
    github_url              TEXT DEFAULT '',
    tags                    TEXT DEFAULT '',
    estimated_token_effort  TEXT NOT NULL DEFAULT 'unknown',
    created_at              TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author     TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrations: add columns to existing DBs
for (const sql of [
  `ALTER TABLE tasks ADD COLUMN estimated_token_effort TEXT NOT NULL DEFAULT 'unknown'`,
  `ALTER TABLE tasks ADD COLUMN display_id TEXT`,
]) {
  try { db.exec(sql); } catch (_) { /* already exists */ }
}

// Backfill display_id
const untagged = db.prepare(`SELECT id FROM tasks WHERE display_id IS NULL ORDER BY id ASC`).all();
if (untagged.length > 0) {
  const existing = db.prepare(`SELECT display_id FROM tasks WHERE display_id IS NOT NULL`).all();
  let maxSeq = 0;
  for (const { display_id } of existing) {
    const m = display_id && display_id.match(/^OC-(\d+)$/);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  const updateStmt = db.prepare(`UPDATE tasks SET display_id = ? WHERE id = ?`);
  const backfill = db.transaction(() => {
    for (const { id } of untagged) {
      maxSeq += 1;
      updateStmt.run(`OC-${String(maxSeq).padStart(3, '0')}`, id);
    }
  });
  backfill();
}

// Helpers (synchronous — better-sqlite3 is sync)

// Kept for backward compat — routes call these directly
function run(sql, params = []) {
  return db.prepare(sql).run(params);
}

function all(sql, params = []) {
  return db.prepare(sql).all(params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(params);
}

function insert(sql, params = []) {
  const result = db.prepare(sql).run(params);
  return result.lastInsertRowid;
}

// getDb kept for any code that awaits it (now sync, returns immediately)
async function getDb() {
  return db;
}

// persist is a no-op — better-sqlite3 writes directly to disk
function persist() {}

module.exports = { getDb, run, all, get, insert, persist, db };
