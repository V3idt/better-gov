import { Database } from "bun:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { ballotItems } from "../src/lib/ballotItems.ts";
import {
  policyIdForItem,
  policyStatusFromBallotStatus,
  type IdentitySource,
  type IdentitySourceType,
  type Person,
  type PolicyRecord,
  type SessionRecord,
  type SubmitVoteResponse,
  type VoteChoice,
  type VoteRecord,
  type VoteStatusResponse,
  type VerifyIdentityInput,
  type VerifyIdentityResponse,
} from "../src/lib/voting.ts";

export const SESSION_COOKIE_NAME = "better-gov.session";
export const DEFAULT_DB_PATH = process.env.BETTER_GOV_DB_PATH ?? "/tmp/better-gov.sqlite";
const DEMO_PERSON_ID = "person_demo";
const DEMO_SESSION_ID = "session_demo";
const MIGRATION_SQL = readFileSync(new URL("./migrations/001_init.sql", import.meta.url), "utf8");

type PersonRow = {
  id: string;
  display_name: string;
  primary_role: Person["primaryRole"];
  created_at: string;
  updated_at: string;
};

type IdentityLinkRow = {
  identity_type: IdentitySourceType;
  identity_value: string;
  verified_at: string;
  person_id: string;
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

export type SessionContext = {
  session: SessionRecord;
  person: Person;
  identitySources: IdentitySource[];
  setCookie?: string;
};

export type VotingDatabase = Database;

export class VotingDatabaseError extends Error {
  code:
    | "policy_not_found"
    | "policy_closed"
    | "invalid_identity"
    | "invalid_vote_choice"
    | "invalid_request"
    | "invalid_session"
    | "invalid_state";

  constructor(
    code: VotingDatabaseError["code"],
    message: string,
  ) {
    super(message);
    this.name = "VotingDatabaseError";
    this.code = code;
  }
}

const now = () => new Date().toISOString();

const randomId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const normalizeIdentityValue = (type: IdentitySourceType, value: string) => {
  const trimmed = value.trim();
  return type === "email_otp" ? trimmed.toLowerCase() : trimmed;
};

const uniqueIdentitySources = (input: VerifyIdentityInput) => {
  const items: Array<[IdentitySourceType, string | undefined]> = [
    ["student_id", input.studentId],
    ["staff_id", input.staffId],
    ["email_otp", input.emailOtp],
  ];

  return items
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([type, value]) => ({
      type,
      value: normalizeIdentityValue(type, value ?? ""),
      verifiedAt: now(),
    }))
    .filter(
      (source, index, sources) =>
        sources.findIndex((candidate) => candidate.type === source.type && candidate.value === source.value) === index,
    );
};

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

const toIdentitySource = (row: IdentityLinkRow): IdentitySource => ({
  type: row.identity_type,
  value: row.identity_value,
  verifiedAt: row.verified_at,
});

const identitySourceRowsForPerson = (db: Database, personId: string) =>
  db
    .prepare(
      `
        SELECT identity_type, identity_value, verified_at, person_id
        FROM identity_links
        WHERE person_id = ?
        ORDER BY verified_at ASC, identity_type ASC, identity_value ASC
      `,
    )
    .all(personId) as IdentityLinkRow[];

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

const voteSql = `
  INSERT INTO votes (policy_id, person_id, choice, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(policy_id, person_id)
  DO UPDATE SET choice = excluded.choice, updated_at = excluded.updated_at
`;

const identitySql = `
  INSERT INTO identity_links (person_id, identity_type, identity_value, verified_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(identity_type, identity_value)
  DO UPDATE SET person_id = excluded.person_id, verified_at = excluded.verified_at
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

const createDemoPerson = (db: Database) => {
  const timestamp = "2026-04-03T09:00:00.000Z";
  db.prepare(personSql).run(DEMO_PERSON_ID, "Verified campus member", "dual", timestamp, timestamp);
  db.prepare(identitySql).run(DEMO_PERSON_ID, "student_id", "S-20481", timestamp);
  db.prepare(identitySql).run(DEMO_PERSON_ID, "staff_id", "T-11804", timestamp);
  db.prepare(identitySql).run(DEMO_PERSON_ID, "email_otp", "verified@university.edu", timestamp);
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

const initializeDatabase = (db: Database) => {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(MIGRATION_SQL);
  createDemoPerson(db);
  seedPolicies(db);
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

export const getPolicyById = (db: Database, policyId: string) => loadPolicy(db, policyId);

export const resolveSessionContext = (db: Database, sessionId: string | null): SessionContext => {
  const requestedSession = sessionId ? loadSession(db, sessionId) : null;
  const shouldBootstrap = !requestedSession;
  const session = requestedSession ?? createDemoSession(db);
  const person = loadPerson(db, session.personId);

  if (!person) {
    throw new VotingDatabaseError("invalid_session", "Session points at a missing person record.");
  }

  return {
    session,
    person,
    identitySources: identitySourceRowsForPerson(db, person.id).map(toIdentitySource),
    setCookie: shouldBootstrap ? buildSessionCookie(session.id) : undefined,
  };
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

export const createDemoSession = (db: Database) => {
  const session = db.prepare(`SELECT id, person_id, created_at, updated_at FROM sessions WHERE id = ?`).get(DEMO_SESSION_ID) as
    | SessionRow
    | undefined;

  if (session) {
    return toSession(session);
  }

  const timestamp = now();
  db.prepare(sessionSql).run(DEMO_SESSION_ID, DEMO_PERSON_ID, timestamp, timestamp);
  return toSession({
    id: DEMO_SESSION_ID,
    person_id: DEMO_PERSON_ID,
    created_at: timestamp,
    updated_at: timestamp,
  });
};

export const buildSessionCookie = (sessionId: string) =>
  `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;

const personIdsForSources = (db: Database, sources: IdentitySource[]) =>
  sources.flatMap((source) =>
    db
      .prepare(
        `
          SELECT DISTINCT person_id
          FROM identity_links
          WHERE identity_type = ? AND identity_value = ?
        `,
      )
      .all(source.type, source.value) as Array<{ person_id: string }>,
  );

const chooseCanonicalPersonId = (db: Database, personIds: string[]) => {
  const uniquePersonIds = [...new Set(personIds)];
  if (!uniquePersonIds.length) {
    return null;
  }

  if (uniquePersonIds.length === 1) {
    return uniquePersonIds[0];
  }

  const placeholders = uniquePersonIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
        SELECT id
        FROM people
        WHERE id IN (${placeholders})
        ORDER BY created_at ASC, id ASC
      `,
    )
    .all(...uniquePersonIds) as Array<{ id: string }>;

  return rows[0]?.id ?? uniquePersonIds[0];
};

const compareVoteRows = (left: VoteRow, right: VoteRow, canonicalPersonId: string) => {
  const updatedOrder = left.updated_at.localeCompare(right.updated_at);
  if (updatedOrder !== 0) {
    return updatedOrder;
  }

  const createdOrder = left.created_at.localeCompare(right.created_at);
  if (createdOrder !== 0) {
    return createdOrder;
  }

  const leftCanonical = left.person_id === canonicalPersonId ? 1 : 0;
  const rightCanonical = right.person_id === canonicalPersonId ? 1 : 0;
  if (leftCanonical !== rightCanonical) {
    return leftCanonical - rightCanonical;
  }

  return left.id - right.id;
};

const mergePeople = (db: Database, canonicalPersonId: string, sourcePersonIds: string[]) => {
  const allPersonIds = [...new Set([canonicalPersonId, ...sourcePersonIds])];
  const otherPersonIds = allPersonIds.filter((personId) => personId !== canonicalPersonId);
  if (!otherPersonIds.length) {
    return;
  }

  const placeholders = allPersonIds.map(() => "?").join(", ");
  const voteRows = db
    .prepare(
      `
        SELECT id, policy_id, person_id, choice, created_at, updated_at
        FROM votes
        WHERE person_id IN (${placeholders})
      `,
    )
    .all(...allPersonIds) as VoteRow[];

  const canonicalVotes = new Map<string, VoteRow>();
  for (const row of voteRows) {
    const existing = canonicalVotes.get(row.policy_id);
    if (!existing || compareVoteRows(row, existing, canonicalPersonId) > 0) {
      canonicalVotes.set(row.policy_id, row);
    }
  }

  db.prepare(`UPDATE identity_links SET person_id = ? WHERE person_id IN (${placeholders})`).run(canonicalPersonId, ...allPersonIds);
  db.prepare(`UPDATE sessions SET person_id = ? WHERE person_id IN (${placeholders})`).run(canonicalPersonId, ...allPersonIds);
  db.prepare(`DELETE FROM votes WHERE person_id IN (${placeholders})`).run(...allPersonIds);
  db.prepare(`DELETE FROM people WHERE id IN (${placeholders}) AND id <> ?`).run(...allPersonIds, canonicalPersonId);

  for (const vote of canonicalVotes.values()) {
    db.prepare(voteSql).run(vote.policy_id, canonicalPersonId, vote.choice, vote.created_at, vote.updated_at);
  }
};

const upsertIdentityLinks = (db: Database, canonicalPersonId: string, sources: IdentitySource[]) => {
  for (const source of sources) {
    db.prepare(identitySql).run(canonicalPersonId, source.type, source.value, source.verifiedAt);
  }
};

const createPersonFromSources = (db: Database, sources: IdentitySource[], displayName?: string) => {
  const sourceTypes = new Set(sources.map((source) => source.type));
  const primaryRole: Person["primaryRole"] =
    sourceTypes.has("student_id") && sourceTypes.has("staff_id")
      ? "dual"
      : sourceTypes.has("staff_id")
        ? "staff"
        : "student";
  const createdAt = now();
  const personId = randomId("person");
  const person = {
    id: personId,
    displayName: displayName?.trim() || "Verified campus member",
    primaryRole,
    createdAt,
    updatedAt: createdAt,
  };

  db.prepare(personSql).run(person.id, person.displayName, person.primaryRole, person.createdAt, person.updatedAt);
  upsertIdentityLinks(db, person.id, sources);
  return person;
};

export const verifyIdentity = (db: Database, input: VerifyIdentityInput, sessionId: string | null): VerifyIdentityResponse => {
  const sources = uniqueIdentitySources(input);
  if (!sources.length) {
    throw new VotingDatabaseError("invalid_identity", "At least one verification source is required.");
  }

  return db.transaction(() => {
    const session = sessionId ? loadSession(db, sessionId) : null;
    const matchedPersonIds = [...new Set(personIdsForSources(db, sources).map((row) => row.person_id))];
    const candidatePersonIds = [...new Set([session?.personId, ...matchedPersonIds].filter(Boolean) as string[])];
    const canonicalPersonId = chooseCanonicalPersonId(db, candidatePersonIds);
    let person: Person;

    if (!canonicalPersonId) {
      person = createPersonFromSources(db, sources, input.displayName);
    } else {
      if (candidatePersonIds.length > 1) {
        mergePeople(db, canonicalPersonId, candidatePersonIds);
      }

      const currentPerson = loadPerson(db, canonicalPersonId);
      if (!currentPerson) {
        throw new VotingDatabaseError("invalid_state", "Canonical person record is missing.");
      }

      person = currentPerson;
      upsertIdentityLinks(db, canonicalPersonId, sources);
    }

    const activePerson = person.id === canonicalPersonId || !canonicalPersonId ? person : loadPerson(db, canonicalPersonId);
    if (!activePerson) {
      throw new VotingDatabaseError("invalid_state", "Unable to resolve a canonical person.");
    }

    const nextSession = session ? createOrUpdateSession(db, session.id, activePerson.id) : createSession(db, activePerson.id);

    return {
      session: nextSession,
      person: activePerson,
      identitySources: identitySourceRowsForPerson(db, activePerson.id).map(toIdentitySource),
    };
  })();
};

const createOrUpdateSession = (db: Database, sessionId: string, personId: string) => {
  const timestamp = now();
  const session = {
    id: sessionId,
    personId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.prepare(sessionSql).run(session.id, session.personId, session.createdAt, session.updatedAt);
  return session;
};

export const getVoteStatus = (db: Database, sessionId: string | null, policyId: string): VoteStatusResponse => {
  const session = resolveSessionContext(db, sessionId);
  const policy = loadPolicy(db, policyId);
  if (!policy) {
    throw new VotingDatabaseError("policy_not_found", "Policy not found.");
  }

  return {
    person: session.person,
    identitySources: session.identitySources,
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
  const session = resolveSessionContext(db, sessionId);
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

export const getResolvedSession = (db: Database, sessionId: string | null) => resolveSessionContext(db, sessionId);

export const normalizeInputSources = uniqueIdentitySources;
