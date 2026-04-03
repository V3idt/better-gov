PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  primary_role TEXT NOT NULL CHECK (primary_role IN ('student', 'staff', 'dual')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS identity_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  identity_type TEXT NOT NULL CHECK (identity_type IN ('student_id', 'staff_id', 'email_otp')),
  identity_value TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  UNIQUE(identity_type, identity_value)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  jurisdiction_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'draft')),
  closes_at TEXT NOT NULL,
  source_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_id TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  choice TEXT NOT NULL CHECK (choice IN ('approve', 'reject', 'abstain')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(policy_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_identity_links_person_id ON identity_links(person_id);
CREATE INDEX IF NOT EXISTS idx_sessions_person_id ON sessions(person_id);
CREATE INDEX IF NOT EXISTS idx_votes_policy_id ON votes(policy_id);
CREATE INDEX IF NOT EXISTS idx_votes_person_id ON votes(person_id);
