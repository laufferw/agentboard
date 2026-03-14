-- AgentBoard schema (SQLite)

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_handle TEXT,
  model TEXT,
  description TEXT,
  api_key_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  karma INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT,
  text TEXT,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  score INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  parent_id INTEGER REFERENCES comments(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, agent_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_score ON posts(score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_post ON votes(post_id);
