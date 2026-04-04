import { Database } from "bun:sqlite";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { ballotItems } from "../src/lib/ballotItems.ts";
import {
  policyIdForItem,
  policyStatusFromBallotStatus,
  type Person,
  type PolicyRecord,
  type RequestSignInCodeResponse,
  type SessionResponse,
  type SessionRecord,
  type SignOutResponse,
  type SubmitVoteResponse,
  type VerifySignInCodeResponse,
  type VoteChoice,
  type VoteRecord,
  type VoteStatusResponse,
} from "../src/lib/voting.ts";

export const SESSION_COOKIE_NAME = "better-gov.session";
export const DEFAULT_DB_PATH = process.env.BETTER_GOV_DB_PATH ?? "/tmp/better-gov.sqlite";

const MIGRATION_SQL = readFileSync(new URL("./migrations/001_init.sql", import.meta.url), "utf8");
const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_FAILED_ATTEMPTS = 5;
const OTP_PEPPER = process.env.BETTER_GOV_OTP_PEPPER ?? "better-gov-local-dev-pepper";
const ALLOWED_EMAIL_DOMAIN = (process.env.BETTER_GOV_ALLOWED_EMAIL_DOMAIN ?? "university.edu").toLowerCase();
const ENABLE_DEV_CODE_ECHO = process.env.NODE_ENV !== "production" || process.env.BETTER_GOV_DEV_AUTH_CODES === "1";

const ROSTER_MEMBERS = [
  {
    personId: "person_rahel_bekele",
    displayName: "Rahel Bekele",
    role: "dual" as const,
    universityEmail: "rahel.bekele@university.edu",
    studentId: "U-10204",
    staffId: "F-20014",
  },
  {
    personId: "person_leila_mekonnen",
    displayName: "Leila Mekonnen",
    role: "student" as const,
    universityEmail: "leila.mekonnen@university.edu",
    studentId: "U-10412",
    staffId: null,
  },
  {
    personId: "person_samuel_abebe",
    displayName: "Samuel Abebe",
    role: "student" as const,
    universityEmail: "samuel.abebe@university.edu",
    studentId: "U-10733",
    staffId: null,
  },
  {
    personId: "person_hana_tadesse",
    displayName: "Hana Tadesse",
    role: "staff" as const,
    universityEmail: "hana.tadesse@university.edu",
    studentId: null,
    staffId: "F-20408",
  },
] as const;

type PersonRow = {
  id: string;
  display_name: string;
  primary_role: Person["primaryRole"];
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  person_id: string;
  created_at: string;
  updated_at: string;
};

type PolicyRow = {
  id: string;
  slug: string;
  jurisdiction_slug: string;
  title: string;
  status: PolicyRecord["status"];
  closes_at: string;
  source_path: string;
  created_at: string;
  updated_at: string;
};

type VoteRow = {
  id: number;
  policy_id: string;
  person_id: string;
  choice: VoteChoice;
  created_at: string;
  updated_at: string;
};

type RosterMemberRow = {
  person_id: string;
  university_email: string;
  student_id: string | null;
  staff_id: string | null;
  role: Person["primaryRole"];
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

type EmailCodeRow = {
  id: string;
  university_email: string;
  code_hash: string;
  expires_at: string;
  consumed_at: string | null;
  failed_attempts: number;
  created_at: string;
  updated_at: string;
};

export type SessionContext = {
  session: SessionRecord;
  person: Person;
};

export type VotingDatabase = Database;

export class VotingDatabaseError extends Error {
  code:
    | "authentication_required"
    | "invalid_email"
    | "invalid_code"
    | "code_expired"
    | "rate_limited"
    | "policy_not_found"
    | "policy_closed"
    | "invalid_vote_choice"
    | "invalid_request"
    | "invalid_session"
    | "invalid_state";

  constructor(code: VotingDatabaseError["code"], message: string) {
    super(message);
    this.name = "VotingDatabaseError";
    this.code = code;
  }
}

const now = () => new Date().toISOString();

const toFutureIso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const randomId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const maskEmail = (value: string) => {
  const [localPart, domain] = normalizeEmail(value).split("@");
  if (!localPart || !domain) {
    return value;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? "*"}*@${domain}`;
  }

  return `${localPart.slice(0, 2)}${"*".repeat(Math.max(localPart.length - 2, 2))}@${domain}`;
};

const isUniversityEmail = (value: string) => {
  const email = normalizeEmail(value);
  return email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`) && email.includes("@");
};

const hashOtpCode = (email: string, code: string) =>
  createHash("sha256")
    .update(`${normalizeEmail(email)}:${code}:${OTP_PEPPER}`)
    .digest("hex");

const secureHashMatch = (storedHash: string, candidateHash: string) =>
  timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(candidateHash, "hex"));

const createOtpCode = () => randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");

const toPerson = (row: PersonRow): Person => ({
  id: row.id,
  displayName: row.display_name,
  primaryRole: row.primary_role,
  createdAt: row.created_at,
});

const toSession = (row: SessionRow): SessionRecord => ({
  id: row.id,
  personId: row.person_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toPolicy = (row: PolicyRow): PolicyRecord => ({
  id: row.id,
  slug: row.slug,
  jurisdictionSlug: row.jurisdiction_slug,
  title: row.title,
  status: row.status,
  closesAt: row.closes_at,
  sourcePath: row.source_path,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toVote = (row: VoteRow): VoteRecord => ({
  id: row.id.toString(),
  policyId: row.policy_id,
  personId: row.person_id,
  choice: row.choice,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const voteSql = `
  INSERT INTO votes (policy_id, person_id, choice, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(policy_id, person_id)
  DO UPDATE SET choice = excluded.choice, updated_at = excluded.updated_at
`;

const personSql = `
  INSERT INTO people (id, display_name, primary_role, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    display_name = excluded.display_name,
    primary_role = excluded.primary_role,
    updated_at = excluded.updated_at
`;

const sessionSql = `
  INSERT INTO sessions (id, person_id, created_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    person_id = excluded.person_id,
    updated_at = excluded.updated_at
`;

const policySql = `
  INSERT INTO policies (
    id,
    slug,
    jurisdiction_slug,
    title,
    status,
    closes_at,
    source_path,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    slug = excluded.slug,
    jurisdiction_slug = excluded.jurisdiction_slug,
    title = excluded.title,
    status = excluded.status,
    closes_at = excluded.closes_at,
    source_path = excluded.source_path,
    updated_at = excluded.updated_at
`;

const rosterMemberSql = `
  INSERT INTO roster_members (
    person_id,
    university_email,
    student_id,
    staff_id,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(person_id) DO UPDATE SET
    university_email = excluded.university_email,
    student_id = excluded.student_id,
    staff_id = excluded.staff_id,
    role = excluded.role,
    status = excluded.status,
    updated_at = excluded.updated_at
`;

const loadPerson = (db: Database, personId: string) => {
  const row = db
    .prepare(
      `
        SELECT id, display_name, primary_role, created_at, updated_at
        FROM people
        WHERE id = ?
      `,
    )
    .get(personId) as PersonRow | undefined;

  return row ? toPerson(row) : null;
};

const loadSession = (db: Database, sessionId: string) => {
  const row = db
    .prepare(
      `
        SELECT id, person_id, created_at, updated_at
        FROM sessions
        WHERE id = ?
      `,
    )
    .get(sessionId) as SessionRow | undefined;

  return row ? toSession(row) : null;
};

const loadPolicy = (db: Database, policyId: string) => {
  const row = db
    .prepare(
      `
        SELECT id, slug, jurisdiction_slug, title, status, closes_at, source_path, created_at, updated_at
        FROM policies
        WHERE id = ?
      `,
    )
    .get(policyId) as PolicyRow | undefined;

  return row ? toPolicy(row) : null;
};

const loadVote = (db: Database, policyId: string, personId: string) => {
  const row = db
    .prepare(
      `
        SELECT id, policy_id, person_id, choice, created_at, updated_at
        FROM votes
        WHERE policy_id = ? AND person_id = ?
      `,
    )
    .get(policyId, personId) as VoteRow | undefined;

  return row ? toVote(row) : null;
};

const loadRosterMemberByEmail = (db: Database, email: string) => {
  const row = db
    .prepare(
      `
        SELECT person_id, university_email, student_id, staff_id, role, status, created_at, updated_at
        FROM roster_members
        WHERE university_email = ?
      `,
    )
    .get(normalizeEmail(email)) as RosterMemberRow | undefined;

  return row ?? null;
};

const loadLatestEmailCode = (db: Database, email: string) => {
  const row = db
    .prepare(
      `
        SELECT id, university_email, code_hash, expires_at, consumed_at, failed_attempts, created_at, updated_at
        FROM email_verification_codes
        WHERE university_email = ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
    )
    .get(normalizeEmail(email)) as EmailCodeRow | undefined;

  return row ?? null;
};

const seedPolicies = (db: Database) => {
  const timestamp = "2026-04-03T09:00:00.000Z";

  for (const item of ballotItems) {
    const policyId = policyIdForItem(item);
    db.prepare(policySql).run(
      policyId,
      item.slug,
      item.jurisdictionSlug,
      item.title,
      policyStatusFromBallotStatus(item.status),
      item.closesOn,
      `/${item.jurisdictionSlug}/${item.slug}`,
      timestamp,
      timestamp,
    );
  }
};

const seedRoster = (db: Database) => {
  const timestamp = "2026-04-04T08:00:00.000Z";

  for (const member of ROSTER_MEMBERS) {
    db.prepare(personSql).run(member.personId, member.displayName, member.role, timestamp, timestamp);
    db.prepare(rosterMemberSql).run(
      member.personId,
      member.universityEmail,
      member.studentId,
      member.staffId,
      member.role,
      "active",
      timestamp,
      timestamp,
    );
  }
};

const initializeDatabase = (db: Database) => {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(MIGRATION_SQL);
  seedPolicies(db);
  seedRoster(db);
};

const createSession = (db: Database, personId: string) => {
  const timestamp = now();
  const session: SessionRecord = {
    id: randomId("session"),
    personId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.prepare(sessionSql).run(session.id, session.personId, session.createdAt, session.updatedAt);
  return session;
};

const requireSessionContext = (db: Database, sessionId: string | null) => {
  const context = getResolvedSession(db, sessionId);
  if (!context) {
    throw new VotingDatabaseError("authentication_required", "Sign in with a university account to continue.");
  }

  return context;
};

export const openVotingDatabase = (dbPath: string = DEFAULT_DB_PATH) => {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  initializeDatabase(db);
  return db;
};

export const closeVotingDatabase = (db: Database) => {
  db.close();
};

export const buildSessionCookie = (sessionId: string) =>
  `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;

export const buildClearSessionCookie = () =>
  `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export const getResolvedSession = (db: Database, sessionId: string | null): SessionContext | null => {
  if (!sessionId) {
    return null;
  }

  const session = loadSession(db, sessionId);
  if (!session) {
    return null;
  }

  const person = loadPerson(db, session.personId);
  if (!person) {
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
    return null;
  }

  return {
    session,
    person,
  };
};

export const getSession = (db: Database, sessionId: string | null): SessionResponse => {
  const context = getResolvedSession(db, sessionId);
  if (!context) {
    return {
      authenticated: false,
      session: null,
      person: null,
    };
  }

  return {
    authenticated: true,
    session: context.session,
    person: context.person,
  };
};

export const requestSignInCode = (db: Database, email: string): RequestSignInCodeResponse => {
  const normalizedEmail = normalizeEmail(email);
  if (!isUniversityEmail(normalizedEmail)) {
    throw new VotingDatabaseError("invalid_email", `Use your @${ALLOWED_EMAIL_DOMAIN} account.`);
  }

  const resendAvailableAt = toFutureIso(OTP_RESEND_COOLDOWN_MS);
  const expiresAt = toFutureIso(OTP_TTL_MS);
  const rosterMember = loadRosterMemberByEmail(db, normalizedEmail);

  if (!rosterMember || rosterMember.status !== "active") {
    return {
      status: "sent",
      destination: maskEmail(normalizedEmail),
      expiresAt,
      resendAvailableAt,
    };
  }

  const latestCode = loadLatestEmailCode(db, normalizedEmail);
  if (latestCode && Date.parse(latestCode.created_at) + OTP_RESEND_COOLDOWN_MS > Date.now()) {
    throw new VotingDatabaseError("rate_limited", "Wait a minute before requesting another code.");
  }

  const code = createOtpCode();
  const timestamp = now();

  db.prepare(
    `
      INSERT INTO email_verification_codes (
        id,
        university_email,
        code_hash,
        expires_at,
        consumed_at,
        failed_attempts,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, NULL, 0, ?, ?)
    `,
  ).run(randomId("otp"), normalizedEmail, hashOtpCode(normalizedEmail, code), toFutureIso(OTP_TTL_MS), timestamp, timestamp);

  return {
    status: "sent",
    destination: maskEmail(normalizedEmail),
    expiresAt,
    resendAvailableAt,
    ...(ENABLE_DEV_CODE_ECHO ? { devCode: code } : {}),
  };
};

export const verifySignInCode = (db: Database, email: string, code: string): VerifySignInCodeResponse =>
  db.transaction(() => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = code.trim();
    if (!isUniversityEmail(normalizedEmail)) {
      throw new VotingDatabaseError("invalid_email", `Use your @${ALLOWED_EMAIL_DOMAIN} account.`);
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      throw new VotingDatabaseError("invalid_code", "Enter the 6-digit code.");
    }

    const rosterMember = loadRosterMemberByEmail(db, normalizedEmail);
    const latestCode = loadLatestEmailCode(db, normalizedEmail);

    if (!rosterMember || rosterMember.status !== "active" || !latestCode || latestCode.consumed_at) {
      throw new VotingDatabaseError("invalid_code", "That code could not be verified.");
    }

    if (Date.parse(latestCode.expires_at) <= Date.now()) {
      throw new VotingDatabaseError("code_expired", "That code expired. Request a new one.");
    }

    if (latestCode.failed_attempts >= OTP_MAX_FAILED_ATTEMPTS) {
      throw new VotingDatabaseError("rate_limited", "Too many attempts. Request a new code.");
    }

    const candidateHash = hashOtpCode(normalizedEmail, normalizedCode);
    if (!secureHashMatch(latestCode.code_hash, candidateHash)) {
      db.prepare(
        `
          UPDATE email_verification_codes
          SET failed_attempts = failed_attempts + 1, updated_at = ?
          WHERE id = ?
        `,
      ).run(now(), latestCode.id);

      throw new VotingDatabaseError("invalid_code", "That code could not be verified.");
    }

    const person = loadPerson(db, rosterMember.person_id);
    if (!person) {
      throw new VotingDatabaseError("invalid_state", "Roster member points at a missing person.");
    }

    const session = createSession(db, person.id);
    const timestamp = now();
    db.prepare(`UPDATE email_verification_codes SET consumed_at = ?, updated_at = ? WHERE id = ?`).run(
      timestamp,
      timestamp,
      latestCode.id,
    );

    return {
      authenticated: true,
      session,
      person,
    };
  })();

export const signOut = (db: Database, sessionId: string | null): SignOutResponse => {
  if (sessionId) {
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
  }

  return { success: true };
};

export const getVoteStatus = (db: Database, sessionId: string | null, policyId: string): VoteStatusResponse => {
  const session = requireSessionContext(db, sessionId);
  const policy = loadPolicy(db, policyId);
  if (!policy) {
    throw new VotingDatabaseError("policy_not_found", "Policy not found.");
  }

  return {
    policy,
    vote: loadVote(db, policyId, session.person.id),
  };
};

export const submitVote = (
  db: Database,
  sessionId: string | null,
  policyId: string,
  choice: VoteChoice,
): SubmitVoteResponse => {
  const session = requireSessionContext(db, sessionId);
  const policy = loadPolicy(db, policyId);

  if (!policy) {
    throw new VotingDatabaseError("policy_not_found", "Policy not found.");
  }

  if (policy.status !== "open") {
    throw new VotingDatabaseError("policy_closed", "This policy is closed.");
  }

  return db.transaction(() => {
    const existingVote = loadVote(db, policyId, session.person.id);
    const timestamp = now();

    db.prepare(voteSql).run(policyId, session.person.id, choice, existingVote?.createdAt ?? timestamp, timestamp);

    return {
      action: existingVote ? "updated" : "created",
      vote: loadVote(db, policyId, session.person.id) as VoteRecord,
    };
  })();
};
