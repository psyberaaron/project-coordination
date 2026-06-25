import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "app.db");

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function createConnection() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export const db = global.__db ?? createConnection();
if (process.env.NODE_ENV !== "production") global.__db = db;

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      awake_window_start TEXT NOT NULL DEFAULT '07:00',
      awake_window_end TEXT NOT NULL DEFAULT '23:00',
      back_at_utc TEXT,
      back_at_note TEXT,
      push_subscription TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      assignee_id TEXT NOT NULL REFERENCES users(id),
      priority TEXT NOT NULL DEFAULT 'Medium',
      deadline_utc TEXT,
      status TEXT NOT NULL DEFAULT 'Todo',
      requires_confirmation INTEGER NOT NULL DEFAULT 0,
      blocking_question TEXT,
      submission_link TEXT,
      submission_note TEXT,
      deadline_notified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      label TEXT
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      actor_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const taskCols = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  if (!taskCols.some((c) => c.name === "deadline_notified_at")) {
    db.exec("ALTER TABLE tasks ADD COLUMN deadline_notified_at TEXT");
  }
}

initSchema();
