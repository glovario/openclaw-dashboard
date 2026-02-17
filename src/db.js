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

  // OC-104: sub-task support — tasks can be children of another task
  _db.run(`
    CREATE TABLE IF NOT EXISTS task_dependencies (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      blocked_by  INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(task_id, blocked_by),
      CHECK(task_id != blocked_by)
    )
  `);

  // Migration: add columns to existing DBs that predate these fields
  try {
    _db.run(`ALTER TABLE tasks ADD COLUMN estimated_token_effort TEXT NOT NULL DEFAULT 'unknown'`);
  } catch (_) { /* column already exists — safe to ignore */ }

  try {
    _db.run(`ALTER TABLE tasks ADD COLUMN display_id TEXT`);
  } catch (_) { /* column already exists — safe to ignore */ }

  try {
    _db.run(`ALTER TABLE tasks ADD COLUMN created_by TEXT NOT NULL DEFAULT 'unknown'`);
  } catch (_) { /* column already exists — safe to ignore */ }

  // OC-104: parent_id — migration for existing DBs
  try {
    _db.run(`ALTER TABLE tasks ADD COLUMN parent_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL`);
  } catch (_) { /* column already exists — safe to ignore */ }

  // Backfill display_id for any tasks that don't have one yet
  const untagged = [];
  {
    const stmt = _db.prepare(`SELECT id FROM tasks WHERE display_id IS NULL ORDER BY id ASC`);
    while (stmt.step()) untagged.push(stmt.getAsObject().id);
    stmt.free();
  }
  if (untagged.length > 0) {
    // Find the highest existing sequence number
    const stmt2 = _db.prepare(`SELECT display_id FROM tasks WHERE display_id IS NOT NULL`);
    let maxSeq = 0;
    while (stmt2.step()) {
      const did = stmt2.getAsObject().display_id;
      const m = did && did.match(/^OC-(\d+)$/);
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
    }
    stmt2.free();
    for (const id of untagged) {
      maxSeq += 1;
      const displayId = `OC-${String(maxSeq).padStart(3, '0')}`;
      _db.run(`UPDATE tasks SET display_id = ? WHERE id = ?`, [displayId, id]);
    }
  }

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
