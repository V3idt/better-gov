import { Database } from "bun:sqlite";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { EmailDeliveryError, isDevelopmentAuthEnabled, sendSignInCodeEmail } from "./email.ts";
import { propositionSeeds } from "./proposition-seeds.ts";
import type {
  AiAudienceRole,
  AiProviderPreference,
  CreatePropositionInput,
  CreatePropositionResponse,
  PropositionAiChatResponse,
  PropositionAiExplanation,
  Person,
  PropositionDetail,
  PropositionDetailResponse,
  PropositionHistoryItem,
  PropositionHistoryResponse,
  PropositionOutcome,
  PropositionReviewCheck,
  PropositionStatus,
  PropositionSummary,
  PropositionListResponse,
  RequestSignInCodeResponse,
  SessionResponse,
  SessionRecord,
  SignOutResponse,
  SubmitVoteResponse,
  VerifySignInCodeResponse,
  VoteChoice,
  VoteRecord,
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
const CLOSING_SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const PROPOSITION_MIN_CLOSE_OFFSET_MS = 60 * 60 * 1000;
const PROPOSITION_MAX_CLOSE_OFFSET_MS = 180 * 24 * 60 * 60 * 1000;
const PROPOSITION_MAX_TITLE_LENGTH = 120;
const PROPOSITION_MAX_CATEGORY_LENGTH = 48;
const PROPOSITION_MAX_SCOPE_LENGTH = 80;
const PROPOSITION_MAX_TLDR_LENGTH = 280;
const PROPOSITION_MAX_BULLET_LENGTH = 200;
const PROPOSITION_MAX_BULLET_COUNT = 6;
const PROPOSITION_MAX_BRIEF_LENGTH = 8_000;
const PROPOSITION_SUBMISSION_WINDOW_MS = 24 * 60 * 60 * 1000;
const PROPOSITION_SUBMISSION_LIMIT_PER_PERSON = 3;
const PROPOSITION_SUBMISSION_LIMIT_PER_IP = 10;
const RATE_LIMIT_PEPPER = process.env.BETTER_GOV_RATE_LIMIT_PEPPER ?? OTP_PEPPER;
const rosterEmail = (localPart: string) => `${localPart}@${ALLOWED_EMAIL_DOMAIN}`;

const ROSTER_MEMBERS = [
  {
    personId: "person_rahel_bekele",
    displayName: "Rahel Bekele",
    role: "dual" as const,
    universityEmail: rosterEmail("rahel.bekele"),
    studentId: "U-10204",
    staffId: "F-20014",
  },
  {
    personId: "person_leila_mekonnen",
    displayName: "Leila Mekonnen",
    role: "student" as const,
    universityEmail: rosterEmail("leila.mekonnen"),
    studentId: "U-10412",
    staffId: null,
  },
  {
    personId: "person_samuel_abebe",
    displayName: "Samuel Abebe",
    role: "student" as const,
    universityEmail: rosterEmail("samuel.abebe"),
    studentId: "U-10733",
    staffId: null,
  },
  {
    personId: "person_hana_tadesse",
    displayName: "Hana Tadesse",
    role: "staff" as const,
    universityEmail: rosterEmail("hana.tadesse"),
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

type PropositionRow = {
  id: string;
  slug: string;
  jurisdiction_slug: string;
  title: string;
  lifecycle_status: "open" | "closed" | "draft";
  closes_at: string;
  source_path: string;
  created_at: string;
  updated_at: string;
  jurisdiction_label: string;
  category: string;
  sponsor: string;
  scope: string;
  tldr: string;
  posted_at: string;
  brief: string;
  display_order: number;
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

type AiExplanationRow = {
  id: number;
  policy_id: string;
  audience_role: AiAudienceRole;
  requested_provider: AiProviderPreference;
  provider_used: PropositionAiExplanation["providerUsed"];
  content_hash: string;
  prompt_version: string;
  explanation_json: string;
  created_at: string;
  updated_at: string;
};

type AiChatAnswerRow = {
  id: number;
  policy_id: string;
  audience_role: AiAudienceRole;
  requested_provider: AiProviderPreference;
  provider_used: PropositionAiChatResponse["providerUsed"];
  question_hash: string;
  content_hash: string;
  prompt_version: string;
  answer_json: string;
  created_at: string;
  updated_at: string;
};

type CountRow = {
  total: number;
};

type VoteCounts = {
  approve: number;
  reject: number;
  abstain: number;
  total: number;
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
    | "delivery_failed"
    | "rate_limited"
    | "proposition_not_found"
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
const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");
const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const hashRateLimitValue = (value: string) =>
  createHash("sha256")
    .update(`${value}:${RATE_LIMIT_PEPPER}`)
    .digest("hex");

const normalizeBulletList = (value: string[]) => {
  const unique = new Set<string>();

  for (const item of value) {
    const bullet = normalizeText(item);
    if (!bullet) {
      continue;
    }

    unique.add(bullet);
  }

  return [...unique];
};

const toSlug = (value: string) => {
  const slug = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return slug || randomId("proposition").replaceAll("_", "-");
};

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

const secureHashMatch = (storedHash: string, candidateHash: string) => {
  if (storedHash.length !== candidateHash.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(candidateHash, "hex"));
};

const createOtpCode = () => randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");

const toDisplayNameFromEmail = (email: string) =>
  normalizeEmail(email)
    .split("@")[0]
    ?.split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ") || "Campus member";

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

const toVote = (row: VoteRow): VoteRecord => ({
  id: row.id.toString(),
  propositionId: row.policy_id,
  personId: row.person_id,
  choice: row.choice,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

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

const propositionDetailSql = `
  INSERT INTO proposition_details (
    policy_id,
    jurisdiction_label,
    category,
    sponsor,
    scope,
    tldr,
    posted_at,
    brief,
    display_order
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(policy_id) DO UPDATE SET
    jurisdiction_label = excluded.jurisdiction_label,
    category = excluded.category,
    sponsor = excluded.sponsor,
    scope = excluded.scope,
    tldr = excluded.tldr,
    posted_at = excluded.posted_at,
    brief = excluded.brief,
    display_order = excluded.display_order
`;

const propositionAuthorshipSql = `
  INSERT INTO proposition_authorship (policy_id, person_id, created_at)
  VALUES (?, ?, ?)
  ON CONFLICT(policy_id) DO UPDATE SET
    person_id = excluded.person_id
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

const voteSql = `
  INSERT INTO votes (policy_id, person_id, choice, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(policy_id, person_id)
  DO UPDATE SET choice = excluded.choice, updated_at = excluded.updated_at
`;

const aiExplanationSql = `
  INSERT INTO ai_explanations (
    policy_id,
    audience_role,
    requested_provider,
    provider_used,
    content_hash,
    prompt_version,
    explanation_json,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(policy_id, audience_role, requested_provider, content_hash, prompt_version)
  DO UPDATE SET
    provider_used = excluded.provider_used,
    explanation_json = excluded.explanation_json,
    updated_at = excluded.updated_at
`;

const aiChatAnswerSql = `
  INSERT INTO ai_chat_answers (
    policy_id,
    audience_role,
    requested_provider,
    provider_used,
    question_hash,
    content_hash,
    prompt_version,
    answer_json,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(policy_id, audience_role, requested_provider, question_hash, content_hash, prompt_version)
  DO UPDATE SET
    provider_used = excluded.provider_used,
    answer_json = excluded.answer_json,
    updated_at = excluded.updated_at
`;

const propositionSubmissionLogSql = `
  INSERT INTO proposition_submission_log (person_id, ip_hash, created_at)
  VALUES (?, ?, ?)
`;

const propositionVoteTotalsSql = `
  INSERT INTO proposition_vote_totals (policy_id, approve_count, reject_count, abstain_count, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(policy_id) DO UPDATE SET
    approve_count = excluded.approve_count,
    reject_count = excluded.reject_count,
    abstain_count = excluded.abstain_count,
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

const propositionSelect = `
  SELECT
    p.id,
    p.slug,
    p.jurisdiction_slug,
    p.title,
    p.status AS lifecycle_status,
    p.closes_at,
    p.source_path,
    p.created_at,
    p.updated_at,
    d.jurisdiction_label,
    d.category,
    d.sponsor,
    d.scope,
    d.tldr,
    d.posted_at,
    d.brief,
    d.display_order
  FROM policies p
  INNER JOIN proposition_details d ON d.policy_id = p.id
`;

const loadPropositionById = (db: Database, propositionId: string) => {
  const row = db
    .prepare(
      `
        ${propositionSelect}
        WHERE p.id = ?
      `,
    )
    .get(propositionId) as PropositionRow | undefined;

  return row ?? null;
};

const loadPropositionByPath = (db: Database, propositionPath: string) => {
  const row = db
    .prepare(
      `
        ${propositionSelect}
        WHERE p.source_path = ?
      `,
    )
    .get(propositionPath) as PropositionRow | undefined;

  return row ?? null;
};

const loadAiExplanation = (
  db: Database,
  propositionId: string,
  audienceRole: AiAudienceRole,
  requestedProvider: AiProviderPreference,
  contentHash: string,
  promptVersion: string,
) => {
  const row = db
    .prepare(
      `
        SELECT id, policy_id, audience_role, requested_provider, provider_used, content_hash, prompt_version, explanation_json, created_at, updated_at
        FROM ai_explanations
        WHERE policy_id = ? AND audience_role = ? AND requested_provider = ? AND content_hash = ? AND prompt_version = ?
      `,
    )
    .get(propositionId, audienceRole, requestedProvider, contentHash, promptVersion) as AiExplanationRow | undefined;

  if (!row) {
    return null;
  }

  return JSON.parse(row.explanation_json) as PropositionAiExplanation;
};

const loadAiChatAnswer = (
  db: Database,
  propositionId: string,
  audienceRole: AiAudienceRole,
  requestedProvider: AiProviderPreference,
  questionHash: string,
  contentHash: string,
  promptVersion: string,
) => {
  const row = db
    .prepare(
      `
        SELECT id, policy_id, audience_role, requested_provider, provider_used, question_hash, content_hash, prompt_version, answer_json, created_at, updated_at
        FROM ai_chat_answers
        WHERE policy_id = ? AND audience_role = ? AND requested_provider = ? AND question_hash = ? AND content_hash = ? AND prompt_version = ?
      `,
    )
    .get(propositionId, audienceRole, requestedProvider, questionHash, contentHash, promptVersion) as
    | AiChatAnswerRow
    | undefined;

  if (!row) {
    return null;
  }

  return JSON.parse(row.answer_json) as PropositionAiChatResponse;
};

const saveAiExplanation = (
  db: Database,
  explanation: PropositionAiExplanation,
  contentHash: string,
  promptVersion: string,
) => {
  const timestamp = now();
  db.prepare(aiExplanationSql).run(
    explanation.propositionId,
    explanation.role,
    explanation.requestedProvider,
    explanation.providerUsed,
    contentHash,
    promptVersion,
    JSON.stringify(explanation),
    timestamp,
    timestamp,
  );
};

const saveAiChatAnswer = (
  db: Database,
  answer: PropositionAiChatResponse,
  questionHash: string,
  contentHash: string,
  promptVersion: string,
) => {
  const timestamp = now();
  db.prepare(aiChatAnswerSql).run(
    answer.propositionId,
    answer.role,
    answer.requestedProvider,
    answer.providerUsed,
    questionHash,
    contentHash,
    promptVersion,
    JSON.stringify(answer),
    timestamp,
    timestamp,
  );
};

const listPropositionRows = (db: Database, lifecycleStatus?: "open" | "closed" | "draft") =>
  db
    .prepare(
      `
        ${propositionSelect}
        ${lifecycleStatus ? "WHERE p.status = ?" : ""}
        ORDER BY d.display_order ASC, d.posted_at DESC, p.title ASC
      `,
    )
    .all(...(lifecycleStatus ? [lifecycleStatus] : [])) as PropositionRow[];

const loadVote = (db: Database, propositionId: string, personId: string) => {
  const row = db
    .prepare(
      `
        SELECT id, policy_id, person_id, choice, created_at, updated_at
        FROM votes
        WHERE policy_id = ? AND person_id = ?
      `,
    )
    .get(propositionId, personId) as VoteRow | undefined;

  return row ? toVote(row) : null;
};

const loadVoteCounts = (db: Database, propositionId: string): VoteCounts => {
  const seededCountsRow = db
    .prepare(
      `
        SELECT approve_count, reject_count, abstain_count
        FROM proposition_vote_totals
        WHERE policy_id = ?
      `,
    )
    .get(propositionId) as
    | { approve_count: number; reject_count: number; abstain_count: number }
    | undefined;

  const rows = db
    .prepare(
      `
        SELECT choice, COUNT(*) AS count
        FROM votes
        WHERE policy_id = ?
        GROUP BY choice
      `,
    )
    .all(propositionId) as Array<{ choice: VoteChoice; count: number }>;

  const counts: VoteCounts = {
    approve: seededCountsRow?.approve_count ?? 0,
    reject: seededCountsRow?.reject_count ?? 0,
    abstain: seededCountsRow?.abstain_count ?? 0,
    total: 0,
  };

  counts.total = counts.approve + counts.reject + counts.abstain;

  for (const row of rows) {
    counts[row.choice] += row.count;
    counts.total += row.count;
  }

  return counts;
};

const loadPropositionBullets = (db: Database, propositionId: string) =>
  (
    db
      .prepare(
        `
          SELECT content
          FROM proposition_bullets
          WHERE policy_id = ?
          ORDER BY position ASC
        `,
      )
      .all(propositionId) as Array<{ content: string }>
  ).map((row) => row.content);

const loadPropositionReviewChecks = (db: Database, propositionId: string) =>
  (
    db
      .prepare(
        `
          SELECT name, status
          FROM proposition_review_checks
          WHERE policy_id = ?
          ORDER BY position ASC
        `,
      )
      .all(propositionId) as Array<PropositionReviewCheck>
  );

const countRecentSubmissionsForPerson = (db: Database, personId: string, sinceIso: string) =>
  (
    db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM proposition_submission_log
          WHERE person_id = ? AND created_at >= ?
        `,
      )
      .get(personId, sinceIso) as CountRow
  ).total;

const countRecentSubmissionsForIp = (db: Database, ipHash: string, sinceIso: string) =>
  (
    db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM proposition_submission_log
          WHERE ip_hash = ? AND created_at >= ?
        `,
      )
      .get(ipHash, sinceIso) as CountRow
  ).total;

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

const loadRosterMemberByPersonId = (db: Database, personId: string) => {
  const row = db
    .prepare(
      `
        SELECT person_id, university_email, student_id, staff_id, role, status, created_at, updated_at
        FROM roster_members
        WHERE person_id = ?
      `,
    )
    .get(personId) as RosterMemberRow | undefined;

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

const loadNextDisplayOrder = (db: Database) =>
  (
    db
      .prepare(
        `
          SELECT COALESCE(MAX(display_order), 0) + 1 AS total
          FROM proposition_details
        `,
      )
      .get() as CountRow
  ).total;

const generateUniquePropositionSlug = (db: Database, jurisdictionSlug: string, title: string) => {
  const baseSlug = toSlug(title);
  let slug = baseSlug;
  let suffix = 2;

  while (
    db
      .prepare(
        `
          SELECT 1
          FROM policies
          WHERE jurisdiction_slug = ? AND slug = ?
          LIMIT 1
        `,
      )
      .get(jurisdictionSlug, slug)
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
};

const propositionStatusForRow = (row: PropositionRow): PropositionStatus => {
  if (row.lifecycle_status === "closed") {
    return "closed";
  }

  if (row.lifecycle_status === "draft") {
    return "draft";
  }

  return Date.parse(row.closes_at) - Date.now() <= CLOSING_SOON_WINDOW_MS ? "closing_soon" : "open";
};

const propositionOutcomeForCounts = (counts: VoteCounts): PropositionOutcome => {
  if (!counts.total) {
    return "NO_RESULT";
  }

  if (counts.approve > counts.reject) {
    return "APPROVED";
  }

  if (counts.reject > counts.approve) {
    return "REJECTED";
  }

  return "TIED";
};

const supportPercentForCounts = (counts: VoteCounts) => (counts.total ? (counts.approve / counts.total) * 100 : null);

const voteBreakdownForCounts = (counts: VoteCounts) => {
  const total = counts.total || 1;
  return [
    {
      choice: "approve" as const,
      label: "Approve",
      share: counts.total ? (counts.approve / total) * 100 : 0,
      count: counts.approve,
    },
    {
      choice: "reject" as const,
      label: "Reject",
      share: counts.total ? (counts.reject / total) * 100 : 0,
      count: counts.reject,
    },
    {
      choice: "abstain" as const,
      label: "Abstain",
      share: counts.total ? (counts.abstain / total) * 100 : 0,
      count: counts.abstain,
    },
  ];
};

const toPropositionSummary = (row: PropositionRow, counts: VoteCounts): PropositionSummary => ({
  id: row.id,
  slug: row.slug,
  jurisdictionSlug: row.jurisdiction_slug,
  path: row.source_path,
  jurisdiction: row.jurisdiction_label,
  category: row.category,
  title: row.title,
  status: propositionStatusForRow(row),
  closesAt: row.closes_at,
  postedAt: row.posted_at,
  sponsor: row.sponsor,
  supportPercent: supportPercentForCounts(counts),
  turnoutCount: counts.total,
});

const toPropositionDetail = (
  db: Database,
  row: PropositionRow,
  counts: VoteCounts,
  myVote: VoteRecord | null,
): PropositionDetail => ({
  ...toPropositionSummary(row, counts),
  scope: row.scope,
  tldr: row.tldr,
  bullets: loadPropositionBullets(db, row.id),
  reviewChecks: loadPropositionReviewChecks(db, row.id),
  voteBreakdown: voteBreakdownForCounts(counts),
  brief: row.brief,
  myVote,
});

const seedPropositions = (db: Database) => {
  const timestamp = "2026-04-04T08:00:00.000Z";

  for (const proposition of propositionSeeds) {
    db.prepare(policySql).run(
      proposition.id,
      proposition.slug,
      proposition.jurisdictionSlug,
      proposition.title,
      proposition.status,
      proposition.closesAt,
      proposition.path,
      timestamp,
      timestamp,
    );

    db.prepare(propositionDetailSql).run(
      proposition.id,
      proposition.jurisdiction,
      proposition.category,
      proposition.sponsor,
      proposition.scope,
      proposition.tldr,
      proposition.postedAt,
      proposition.brief,
      proposition.displayOrder,
    );

    db.prepare(`DELETE FROM proposition_bullets WHERE policy_id = ?`).run(proposition.id);
    db.prepare(`DELETE FROM proposition_review_checks WHERE policy_id = ?`).run(proposition.id);

    proposition.bullets.forEach((bullet, index) => {
      db.prepare(
        `
          INSERT INTO proposition_bullets (policy_id, position, content)
          VALUES (?, ?, ?)
        `,
      ).run(proposition.id, index, bullet);
    });

    proposition.reviewChecks.forEach((check, index) => {
      db.prepare(
        `
          INSERT INTO proposition_review_checks (policy_id, position, name, status)
          VALUES (?, ?, ?, ?)
        `,
      ).run(proposition.id, index, check.name, check.status);
    });

    const seededVotes = proposition.seedVotes ?? { approve: 0, reject: 0, abstain: 0 };
    db.prepare(propositionVoteTotalsSql).run(
      proposition.id,
      seededVotes.approve,
      seededVotes.reject,
      seededVotes.abstain,
      timestamp,
    );
  }
};

const seedRoster = (db: Database) => {
  const timestamp = "2026-04-04T08:00:00.000Z";

  for (const member of ROSTER_MEMBERS) {
    const existingRosterMember = loadRosterMemberByPersonId(db, member.personId);
    if (existingRosterMember && existingRosterMember.university_email !== member.universityEmail) {
      db.prepare(`DELETE FROM email_verification_codes WHERE university_email = ?`).run(existingRosterMember.university_email);
      db.prepare(`DELETE FROM roster_members WHERE person_id = ?`).run(member.personId);
    }

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

const ensureDevelopmentRosterMember = (db: Database, email: string) => {
  const normalizedEmail = normalizeEmail(email);
  const existing = loadRosterMemberByEmail(db, normalizedEmail);
  if (existing) {
    return existing;
  }

  if (!isDevelopmentAuthEnabled()) {
    return null;
  }

  const timestamp = now();
  const personId = randomId("person_dev");
  db.prepare(personSql).run(personId, toDisplayNameFromEmail(normalizedEmail), "student", timestamp, timestamp);
  db.prepare(rosterMemberSql).run(
    personId,
    normalizedEmail,
    null,
    null,
    "student",
    "active",
    timestamp,
    timestamp,
  );

  return loadRosterMemberByPersonId(db, personId);
};

const initializeDatabase = (db: Database) => {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(MIGRATION_SQL);
  seedPropositions(db);
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

const isPropositionOpenForVoting = (row: PropositionRow) =>
  row.lifecycle_status === "open" && Date.parse(row.closes_at) > Date.now();

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

export const requestSignInCode = async (db: Database, email: string): Promise<RequestSignInCodeResponse> => {
  if (!hasText(email)) {
    throw new VotingDatabaseError("invalid_email", "Enter your university email.");
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isUniversityEmail(normalizedEmail)) {
    throw new VotingDatabaseError("invalid_email", `Use your @${ALLOWED_EMAIL_DOMAIN} account.`);
  }

  const resendAvailableAt = toFutureIso(OTP_RESEND_COOLDOWN_MS);
  const expiresAt = toFutureIso(OTP_TTL_MS);
  const rosterMember = loadRosterMemberByEmail(db, normalizedEmail) ?? ensureDevelopmentRosterMember(db, normalizedEmail);

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
  const codeId = randomId("otp");

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
  ).run(codeId, normalizedEmail, hashOtpCode(normalizedEmail, code), toFutureIso(OTP_TTL_MS), timestamp, timestamp);

  let deliveryResult;
  try {
    deliveryResult = await sendSignInCodeEmail(normalizedEmail, code);
  } catch (error) {
    db.prepare(`DELETE FROM email_verification_codes WHERE id = ?`).run(codeId);

    if (error instanceof EmailDeliveryError) {
      throw new VotingDatabaseError("delivery_failed", error.message);
    }

    throw error;
  }

  return {
    status: "sent",
    destination: maskEmail(normalizedEmail),
    expiresAt,
    resendAvailableAt,
    ...(deliveryResult.mode === "development" ? { devCode: deliveryResult.devCode } : {}),
  };
};

export const verifySignInCode = (db: Database, email: string, code: string): VerifySignInCodeResponse =>
  db.transaction(() => {
    if (!hasText(email)) {
      throw new VotingDatabaseError("invalid_email", "Enter your university email.");
    }

    if (!hasText(code)) {
      throw new VotingDatabaseError("invalid_code", "Enter the 6-digit code.");
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = code.trim();
    if (!isUniversityEmail(normalizedEmail)) {
      throw new VotingDatabaseError("invalid_email", `Use your @${ALLOWED_EMAIL_DOMAIN} account.`);
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      throw new VotingDatabaseError("invalid_code", "Enter the 6-digit code.");
    }

  const rosterMember = loadRosterMemberByEmail(db, normalizedEmail) ?? ensureDevelopmentRosterMember(db, normalizedEmail);
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

export const listPropositions = (db: Database): PropositionListResponse => {
  const propositions = listPropositionRows(db)
    .map((row) => ({ row, counts: loadVoteCounts(db, row.id) }))
    .filter(({ row }) => row.lifecycle_status !== "closed")
    .map(({ row, counts }) => toPropositionSummary(row, counts));

  return { propositions };
};

export const listPropositionHistory = (db: Database): PropositionHistoryResponse => {
  const propositions: PropositionHistoryItem[] = listPropositionRows(db, "closed").map((row) => {
    const counts = loadVoteCounts(db, row.id);
    return {
      ...toPropositionSummary(row, counts),
      outcome: propositionOutcomeForCounts(counts),
    };
  });

  return { propositions };
};

export const getPropositionDetail = (
  db: Database,
  sessionId: string | null,
  propositionPath: string,
): PropositionDetailResponse => {
  const proposition = loadPropositionByPath(db, propositionPath);
  if (!proposition) {
    throw new VotingDatabaseError("proposition_not_found", "Proposition not found.");
  }

  const session = getResolvedSession(db, sessionId);
  const counts = loadVoteCounts(db, proposition.id);

  return {
    proposition: toPropositionDetail(
      db,
      proposition,
      counts,
      session ? loadVote(db, proposition.id, session.person.id) : null,
    ),
  };
};

export const getPropositionDetailById = (
  db: Database,
  sessionId: string | null,
  propositionId: string,
): PropositionDetailResponse => {
  const proposition = loadPropositionById(db, propositionId);
  if (!proposition) {
    throw new VotingDatabaseError("proposition_not_found", "Proposition not found.");
  }

  const session = getResolvedSession(db, sessionId);
  const counts = loadVoteCounts(db, proposition.id);

  return {
    proposition: toPropositionDetail(
      db,
      proposition,
      counts,
      session ? loadVote(db, proposition.id, session.person.id) : null,
    ),
  };
};

const validateCreatePropositionInput = (input: CreatePropositionInput) => {
  const title = normalizeText(input.title);
  const category = normalizeText(input.category);
  const scope = normalizeText(input.scope);
  const tldr = normalizeText(input.tldr);
  const brief = input.brief.trim();
  const bullets = normalizeBulletList(input.bullets);
  const closesAtMs = Date.parse(input.closesAt);

  if (!title || title.length > PROPOSITION_MAX_TITLE_LENGTH) {
    throw new VotingDatabaseError(
      "invalid_request",
      `Title is required and must be ${PROPOSITION_MAX_TITLE_LENGTH} characters or fewer.`,
    );
  }

  if (!category || category.length > PROPOSITION_MAX_CATEGORY_LENGTH) {
    throw new VotingDatabaseError(
      "invalid_request",
      `Category is required and must be ${PROPOSITION_MAX_CATEGORY_LENGTH} characters or fewer.`,
    );
  }

  if (!scope || scope.length > PROPOSITION_MAX_SCOPE_LENGTH) {
    throw new VotingDatabaseError(
      "invalid_request",
      `Scope is required and must be ${PROPOSITION_MAX_SCOPE_LENGTH} characters or fewer.`,
    );
  }

  if (!tldr || tldr.length > PROPOSITION_MAX_TLDR_LENGTH) {
    throw new VotingDatabaseError(
      "invalid_request",
      `tl;dr is required and must be ${PROPOSITION_MAX_TLDR_LENGTH} characters or fewer.`,
    );
  }

  if (!brief || brief.length > PROPOSITION_MAX_BRIEF_LENGTH) {
    throw new VotingDatabaseError(
      "invalid_request",
      `Full brief is required and must be ${PROPOSITION_MAX_BRIEF_LENGTH} characters or fewer.`,
    );
  }

  if (bullets.length > PROPOSITION_MAX_BULLET_COUNT) {
    throw new VotingDatabaseError(
      "invalid_request",
      `Use ${PROPOSITION_MAX_BULLET_COUNT} key points or fewer.`,
    );
  }

  if (bullets.some((bullet) => bullet.length > PROPOSITION_MAX_BULLET_LENGTH)) {
    throw new VotingDatabaseError(
      "invalid_request",
      `Each key point must be ${PROPOSITION_MAX_BULLET_LENGTH} characters or fewer.`,
    );
  }

  if (Number.isNaN(closesAtMs)) {
    throw new VotingDatabaseError("invalid_request", "Choose a valid closing time.");
  }

  const closeOffset = closesAtMs - Date.now();
  if (closeOffset < PROPOSITION_MIN_CLOSE_OFFSET_MS) {
    throw new VotingDatabaseError("invalid_request", "Closing time must be at least one hour in the future.");
  }

  if (closeOffset > PROPOSITION_MAX_CLOSE_OFFSET_MS) {
    throw new VotingDatabaseError("invalid_request", "Closing time must be within the next 180 days.");
  }

  return {
    title,
    category,
    scope,
    tldr,
    brief,
    bullets,
    closesAt: new Date(closesAtMs).toISOString(),
  };
};

export const createProposition = (
  db: Database,
  sessionId: string | null,
  input: CreatePropositionInput,
  clientIpAddress: string | null,
): CreatePropositionResponse => {
  const session = requireSessionContext(db, sessionId);
  const validated = validateCreatePropositionInput(input);
  const ipHash = clientIpAddress ? hashRateLimitValue(clientIpAddress) : null;
  const submissionWindowStart = new Date(Date.now() - PROPOSITION_SUBMISSION_WINDOW_MS).toISOString();

  return db.transaction(() => {
    const personSubmissionCount = countRecentSubmissionsForPerson(db, session.person.id, submissionWindowStart);
    if (personSubmissionCount >= PROPOSITION_SUBMISSION_LIMIT_PER_PERSON) {
      throw new VotingDatabaseError(
        "rate_limited",
        `You can submit up to ${PROPOSITION_SUBMISSION_LIMIT_PER_PERSON} propositions per day.`,
      );
    }

    if (ipHash && countRecentSubmissionsForIp(db, ipHash, submissionWindowStart) >= PROPOSITION_SUBMISSION_LIMIT_PER_IP) {
      throw new VotingDatabaseError("rate_limited", "Too many proposition submissions from this connection. Try again later.");
    }

    const timestamp = now();
    const jurisdictionSlug = "campus";
    const jurisdictionLabel = "Campus";
    const slug = generateUniquePropositionSlug(db, jurisdictionSlug, validated.title);
    const propositionId = `${jurisdictionSlug}:${slug}`;
    const path = `/${jurisdictionSlug}/${slug}`;
    const displayOrder = loadNextDisplayOrder(db);

    db.prepare(policySql).run(
      propositionId,
      slug,
      jurisdictionSlug,
      validated.title,
      "draft",
      validated.closesAt,
      path,
      timestamp,
      timestamp,
    );

    db.prepare(propositionDetailSql).run(
      propositionId,
      jurisdictionLabel,
      validated.category,
      session.person.displayName,
      validated.scope,
      validated.tldr,
      timestamp,
      validated.brief,
      displayOrder,
    );

    validated.bullets.forEach((bullet, index) => {
      db.prepare(
        `
          INSERT INTO proposition_bullets (policy_id, position, content)
          VALUES (?, ?, ?)
        `,
      ).run(propositionId, index, bullet);
    });

    db.prepare(propositionAuthorshipSql).run(propositionId, session.person.id, timestamp);
    db.prepare(propositionSubmissionLogSql).run(session.person.id, ipHash, timestamp);

    return getPropositionDetailById(db, sessionId, propositionId);
  })();
};

export const getCachedAiExplanation = (
  db: Database,
  propositionId: string,
  audienceRole: AiAudienceRole,
  requestedProvider: AiProviderPreference,
  contentHash: string,
  promptVersion: string,
) => loadAiExplanation(db, propositionId, audienceRole, requestedProvider, contentHash, promptVersion);

export const storeAiExplanation = (
  db: Database,
  explanation: PropositionAiExplanation,
  contentHash: string,
  promptVersion: string,
) => saveAiExplanation(db, explanation, contentHash, promptVersion);

export const getCachedAiChatAnswer = (
  db: Database,
  propositionId: string,
  audienceRole: AiAudienceRole,
  requestedProvider: AiProviderPreference,
  questionHash: string,
  contentHash: string,
  promptVersion: string,
) => loadAiChatAnswer(db, propositionId, audienceRole, requestedProvider, questionHash, contentHash, promptVersion);

export const storeAiChatAnswer = (
  db: Database,
  answer: PropositionAiChatResponse,
  questionHash: string,
  contentHash: string,
  promptVersion: string,
) => saveAiChatAnswer(db, answer, questionHash, contentHash, promptVersion);

export const submitVote = (
  db: Database,
  sessionId: string | null,
  propositionId: string,
  choice: VoteChoice,
): SubmitVoteResponse => {
  const session = requireSessionContext(db, sessionId);
  const proposition = loadPropositionById(db, propositionId);

  if (!proposition) {
    throw new VotingDatabaseError("proposition_not_found", "Proposition not found.");
  }

  if (!isPropositionOpenForVoting(proposition)) {
    throw new VotingDatabaseError("policy_closed", "This proposition is not open for voting.");
  }

  return db.transaction(() => {
    const existingVote = loadVote(db, propositionId, session.person.id);
    const timestamp = now();

    db.prepare(voteSql).run(propositionId, session.person.id, choice, existingVote?.createdAt ?? timestamp, timestamp);

    return {
      action: existingVote ? "updated" : "created",
      vote: loadVote(db, propositionId, session.person.id) as VoteRecord,
    };
  })();
};
