PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  gender TEXT,
  age INTEGER,
  guardian_email TEXT,
  login_id TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_sessions (
  user_id INTEGER NOT NULL,
  day_index INTEGER NOT NULL,
  played_at TEXT DEFAULT (datetime('now')),
  total_score INTEGER NOT NULL,
  status TEXT CHECK(status IN ('success','fail')) NOT NULL,
  PRIMARY KEY (user_id, day_index),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  day_index INTEGER NOT NULL,
  mode TEXT CHECK(mode IN ('recall','quiz','emotion')) NOT NULL,
  payload TEXT,
  score INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_answers_user_day ON answers(user_id, day_index);
