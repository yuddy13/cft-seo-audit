import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), 'data', 'smb.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS niches (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      slug       TEXT NOT NULL UNIQUE,
      enabled    INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS queries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      niche_id    INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
      query_num   INTEGER NOT NULL,
      query_text  TEXT NOT NULL,
      intent_type TEXT NOT NULL,
      edited      INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS runs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      is_pilot     INTEGER NOT NULL DEFAULT 0,
      niche_ids    TEXT NOT NULL DEFAULT '[]',
      total_calls  INTEGER NOT NULL DEFAULT 0,
      done_calls   INTEGER NOT NULL DEFAULT 0,
      failed_calls INTEGER NOT NULL DEFAULT 0,
      retried_calls INTEGER NOT NULL DEFAULT 0,
      tokens_in    INTEGER NOT NULL DEFAULT 0,
      tokens_out   INTEGER NOT NULL DEFAULT 0,
      spend_usd    REAL NOT NULL DEFAULT 0,
      started_at   TEXT,
      finished_at  TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS run_results (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id        INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      niche_id      INTEGER NOT NULL REFERENCES niches(id),
      query_id      INTEGER NOT NULL REFERENCES queries(id),
      query_text    TEXT NOT NULL,
      intent_type   TEXT NOT NULL,
      model_id      TEXT NOT NULL,
      model_label   TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending',
      raw_response  TEXT,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      spend_usd     REAL NOT NULL DEFAULT 0,
      attempt       INTEGER NOT NULL DEFAULT 1,
      error_msg     TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS citations (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id       INTEGER NOT NULL REFERENCES run_results(id) ON DELETE CASCADE,
      run_id          INTEGER NOT NULL,
      niche_id        INTEGER NOT NULL,
      query_text      TEXT NOT NULL,
      query_num       INTEGER NOT NULL,
      intent_type     TEXT NOT NULL,
      model_label     TEXT NOT NULL,
      full_url        TEXT,
      root_domain     TEXT NOT NULL,
      citation_type   TEXT NOT NULL,
      recommended_brand TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_citations_niche ON citations(niche_id);
    CREATE INDEX IF NOT EXISTS idx_citations_domain ON citations(root_domain);
    CREATE INDEX IF NOT EXISTS idx_run_results_run ON run_results(run_id);
    CREATE INDEX IF NOT EXISTS idx_queries_niche ON queries(niche_id);
  `);

  // Seed default niches if empty
  const count = (db.prepare('SELECT COUNT(*) as c FROM niches').get() as { c: number }).c;
  if (count === 0) {
    const insert = db.prepare(
      'INSERT INTO niches (name, slug) VALUES (?, ?)'
    );
    const niches = [
      ['iGaming', 'igaming'],
      ['Crypto', 'crypto'],
      ['SaaS', 'saas'],
      ['Legal', 'legal'],
      ['Finance', 'finance'],
      ['Ecommerce', 'ecommerce'],
      ['Health', 'health'],
      ['Real Estate', 'real-estate'],
      ['Travel', 'travel'],
      ['B2B', 'b2b'],
    ];
    for (const [name, slug] of niches) insert.run(name, slug);
  }
}
