PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  primary_role TEXT NOT NULL CHECK (primary_role IN ('student', 'staff', 'dual')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
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
  ai_generated INTEGER NOT NULL DEFAULT 0,
  ai_source_policy_id TEXT,
  ai_rationale TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposition_details (
  policy_id TEXT PRIMARY KEY REFERENCES policies(id) ON DELETE CASCADE,
  jurisdiction_label TEXT NOT NULL,
  category TEXT NOT NULL,
  sponsor TEXT NOT NULL,
  scope TEXT NOT NULL,
  tldr TEXT NOT NULL,
  posted_at TEXT NOT NULL,
  brief TEXT NOT NULL,
  display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS proposition_bullets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_id TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  content TEXT NOT NULL,
  UNIQUE(policy_id, position)
);

CREATE TABLE IF NOT EXISTS proposition_review_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_id TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PASS', 'WARN', 'FAIL')),
  UNIQUE(policy_id, position)
);

CREATE TABLE IF NOT EXISTS proposition_authorship (
  policy_id TEXT PRIMARY KEY REFERENCES policies(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposition_submission_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  ip_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposition_vote_totals (
  policy_id TEXT PRIMARY KEY REFERENCES policies(id) ON DELETE CASCADE,
  approve_count INTEGER NOT NULL DEFAULT 0,
  reject_count INTEGER NOT NULL DEFAULT 0,
  abstain_count INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS roster_members (
  person_id TEXT PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
  university_email TEXT NOT NULL UNIQUE,
  student_id TEXT UNIQUE,
  staff_id TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('student', 'staff', 'dual')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id TEXT PRIMARY KEY,
  university_email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (university_email) REFERENCES roster_members(university_email) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_explanations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_id TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  audience_role TEXT NOT NULL CHECK (audience_role IN ('student', 'staff')),
  requested_provider TEXT NOT NULL CHECK (requested_provider IN ('auto', 'openai', 'gemini', 'grok')),
  provider_used TEXT NOT NULL CHECK (provider_used IN ('openai', 'gemini', 'grok', 'fallback')),
  content_hash TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  explanation_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(policy_id, audience_role, requested_provider, content_hash, prompt_version)
);

CREATE TABLE IF NOT EXISTS ai_chat_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_id TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  audience_role TEXT NOT NULL CHECK (audience_role IN ('student', 'staff')),
  requested_provider TEXT NOT NULL CHECK (requested_provider IN ('auto', 'openai', 'gemini', 'grok')),
  provider_used TEXT NOT NULL CHECK (provider_used IN ('openai', 'gemini', 'grok', 'fallback')),
  question_hash TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  answer_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(policy_id, audience_role, requested_provider, question_hash, content_hash, prompt_version)
);

CREATE TABLE IF NOT EXISTS ai_policy_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_id TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  requested_provider TEXT NOT NULL CHECK (requested_provider IN ('auto', 'openai', 'gemini', 'grok')),
  provider_used TEXT NOT NULL CHECK (provider_used IN ('openai', 'gemini', 'grok', 'fallback')),
  content_hash TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(policy_id, requested_provider, content_hash, prompt_version)
);

CREATE INDEX IF NOT EXISTS idx_sessions_person_id ON sessions(person_id);
CREATE INDEX IF NOT EXISTS idx_votes_policy_id ON votes(policy_id);
CREATE INDEX IF NOT EXISTS idx_votes_person_id ON votes(person_id);
CREATE INDEX IF NOT EXISTS idx_proposition_details_order ON proposition_details(display_order);
CREATE INDEX IF NOT EXISTS idx_proposition_bullets_policy_id ON proposition_bullets(policy_id);
CREATE INDEX IF NOT EXISTS idx_proposition_checks_policy_id ON proposition_review_checks(policy_id);
CREATE INDEX IF NOT EXISTS idx_proposition_authorship_person_id ON proposition_authorship(person_id);
CREATE INDEX IF NOT EXISTS idx_proposition_submission_log_person_created ON proposition_submission_log(person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposition_submission_log_ip_created ON proposition_submission_log(ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposition_vote_totals_updated_at ON proposition_vote_totals(updated_at);
CREATE INDEX IF NOT EXISTS idx_roster_members_email ON roster_members(university_email);
CREATE INDEX IF NOT EXISTS idx_email_codes_email_created ON email_verification_codes(university_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_explanations_policy_role_provider ON ai_explanations(policy_id, audience_role, requested_provider);
CREATE INDEX IF NOT EXISTS idx_ai_chat_answers_policy_role_provider ON ai_chat_answers(policy_id, audience_role, requested_provider);
CREATE INDEX IF NOT EXISTS idx_ai_policy_drafts_policy_provider ON ai_policy_drafts(policy_id, requested_provider);
