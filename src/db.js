const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'dashboard.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let _db = null;

async function getDb() {
  if (_db) return _db;

  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  // Enable WAL-like behaviour (sql.js is in-memory, we persist on write)
  _db.run(`
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
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author     TEXT NOT NULL,
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migration: add column to existing DBs that predate this field
  try {
    _db.run(`ALTER TABLE tasks ADD COLUMN estimated_token_effort TEXT NOT NULL DEFAULT 'unknown'`);
  } catch (_) { /* column already exists — safe to ignore */ }

  persist();
  return _db;
}

function persist() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Helper: run a query and persist
function run(sql, params = []) {
  if (!_db) throw new Error('DB not initialised');
  _db.run(sql, params);
  persist();
}

// Helper: get all rows as objects
function all(sql, params = []) {
  if (!_db) throw new Error('DB not initialised');
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: get single row
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] || null;
}

// Helper: run and return last insert rowid
function insert(sql, params = []) {
  if (!_db) throw new Error('DB not initialised');
  _db.run(sql, params);
  const result = get('SELECT last_insert_rowid() as id');
  persist();
  return result ? result.id : null;
}

module.exports = { getDb, run, all, get, insert, persist };
