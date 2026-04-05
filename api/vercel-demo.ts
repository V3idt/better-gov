import { randomInt, randomUUID } from "node:crypto";
import { propositionSeeds, type SeedProposition } from "../server/proposition-seeds.ts";
import {
  propositionPathFromParts,
  selectAiDraftSourcePropositions,
  type AiAudienceRole,
  type AiProviderPreference,
  type CreatePropositionInput,
  type CreatePropositionResponse,
  type Person,
  type PropositionAiChatRequest,
  type PropositionAiChatResponse,
  type PropositionAiDraftRequest,
  type PropositionAiDraftResponse,
  type PropositionAiExplanationRequest,
  type PropositionAiExplanationResponse,
  type PropositionAiPolicyBuilderStatus,
  type PropositionAiSourceSummary,
  type PropositionBreakdownItem,
  type PropositionDetail,
  type PropositionDetailResponse,
  type PropositionHistoryItem,
  type PropositionHistoryResponse,
  type PropositionListMode,
  type PropositionListResponse,
  type PropositionOutcome,
  type PropositionReviewCheck,
  type PropositionStatus,
  type PropositionSummary,
  type PropositionVoteHistoryPoint,
  type PropositionVoteHistoryResponse,
  type RequestSignInCodeInput,
  type RequestSignInCodeResponse,
  type SecurityStatusResponse,
  type SessionRecord,
  type SessionResponse,
  type SignOutResponse,
  type SubmitVoteResponse,
  type VerifySignInCodeInput,
  type VerifySignInCodeResponse,
  type VoteChoice,
  type VoteRecord,
} from "../src/lib/voting.ts";

const SESSION_COOKIE_NAME = "better-gov.session";
const ALLOWED_EMAIL_DOMAIN = (process.env.BETTER_GOV_ALLOWED_EMAIL_DOMAIN ?? "university.edu").toLowerCase();
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_FAILED_ATTEMPTS = 5;
const AUTH_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const AUTH_REQUEST_LIMIT_PER_EMAIL = 5;
const AUTH_REQUEST_LIMIT_PER_IP = 20;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CLOSING_SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const PROPOSITION_SUBMISSION_WINDOW_MS = 24 * 60 * 60 * 1000;
const PROPOSITION_SUBMISSION_LIMIT_PER_PERSON = 3;
const PROPOSITION_SUBMISSION_LIMIT_PER_IP = 10;
const COOKIE_SECURE = process.env.NODE_ENV === "production" || process.env.BETTER_GOV_COOKIE_SECURE === "1";
const AI_PROVIDER_USED = "fallback" as const;
const EMAIL_FROM = process.env.BETTER_GOV_EMAIL_FROM?.trim() ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() ?? "";
const SMTP_HOST = process.env.BETTER_GOV_SMTP_HOST?.trim() ?? "";
const SMTP_USER = process.env.BETTER_GOV_SMTP_USER?.trim() ?? "";
const SMTP_PASS = process.env.BETTER_GOV_SMTP_PASS?.trim() ?? "";

type DemoCodeRecord = {
  email: string;
  code: string;
  expiresAt: string;
  resendAvailableAt: string;
  failedAttempts: number;
};

type DemoSessionRecord = {
  session: SessionRecord;
  person: Person;
  email: string;
  expiresAtMs: number;
};

type DemoPropositionRecord = SeedProposition & {
  aiGenerated: boolean;
  aiOrigin: PropositionDetail["aiOrigin"];
  isUserPosted: boolean;
};

type DemoState = {
  propositions: DemoPropositionRecord[];
  peopleByEmail: Map<string, Person>;
  sessions: Map<string, DemoSessionRecord>;
  codes: Map<string, DemoCodeRecord>;
  votes: Map<string, VoteRecord>;
  authRequestsByEmail: Map<string, number[]>;
  authRequestsByIp: Map<string, number[]>;
  submissionTimestampsByPerson: Map<string, number[]>;
  submissionTimestampsByIp: Map<string, number[]>;
  auditEvents: string[];
};

class DemoApiError extends Error {
  constructor(
    readonly code:
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
      | "invalid_state",
    message: string,
  ) {
    super(message);
    this.name = "DemoApiError";
  }
}

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });

const errorResponse = (error: unknown, headers: HeadersInit = {}) => {
  if (error instanceof DemoApiError) {
    const statusByCode: Record<DemoApiError["code"], number> = {
      authentication_required: 401,
      invalid_email: 400,
      invalid_code: 400,
      code_expired: 410,
      delivery_failed: 500,
      rate_limited: 429,
      proposition_not_found: 404,
      policy_closed: 409,
      invalid_vote_choice: 400,
      invalid_request: 400,
      invalid_session: 401,
      invalid_state: 500,
    };

    return json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      statusByCode[error.code],
      headers,
    );
  }

  console.error("[vercel-demo] unhandled error", error);
  return json(
    {
      error: {
        code: "internal_error",
        message: "Internal server error.",
      },
    },
    500,
    headers,
  );
};

const cloneReviewChecks = (checks: PropositionReviewCheck[]) => checks.map((check) => ({ ...check }));

const cloneSeedProposition = (proposition: SeedProposition): DemoPropositionRecord => ({
  ...proposition,
  bullets: [...proposition.bullets],
  reviewChecks: cloneReviewChecks(proposition.reviewChecks),
  seedVotes: proposition.seedVotes ? { ...proposition.seedVotes } : undefined,
  voteHistory: proposition.voteHistory?.map((point) => ({ ...point })),
  aiGenerated: false,
  aiOrigin: null,
  isUserPosted: false,
});

const initialState = (): DemoState => ({
  propositions: propositionSeeds.map(cloneSeedProposition),
  peopleByEmail: new Map(),
  sessions: new Map(),
  codes: new Map(),
  votes: new Map(),
  authRequestsByEmail: new Map(),
  authRequestsByIp: new Map(),
  submissionTimestampsByPerson: new Map(),
  submissionTimestampsByIp: new Map(),
  auditEvents: [],
});

const globalState = globalThis as typeof globalThis & {
  __betterGovVercelDemoState?: DemoState;
};

const getEmailDeliveryMode = () => {
  if (RESEND_API_KEY && EMAIL_FROM) {
    return "resend" as const;
  }

  if (SMTP_HOST && SMTP_USER && SMTP_PASS && EMAIL_FROM) {
    return "smtp" as const;
  }

  return "development" as const;
};

const getState = () => {
  if (!globalState.__betterGovVercelDemoState) {
    globalState.__betterGovVercelDemoState = initialState();
  }

  return globalState.__betterGovVercelDemoState;
};

export const resetVercelDemoState = () => {
  delete globalState.__betterGovVercelDemoState;
};

const readSessionCookie = (request: Request) => {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const buildSessionCookie = (sessionId: string) =>
  `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
    SESSION_TTL_MS / 1000,
  )}${COOKIE_SECURE ? "; Secure" : ""}`;

const buildClearSessionCookie = () =>
  `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE ? "; Secure" : ""}`;

const readClientAddress = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstAddress = forwarded
      .split(",")
      .map((part) => part.trim())
      .find(Boolean);

    if (firstAddress) {
      return firstAddress;
    }
  }

  return request.headers.get("x-real-ip") ?? "unknown";
};

const parseJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new DemoApiError("invalid_request", "Request body must be valid JSON.");
  }
};

const sanitizeRollingWindow = (timestamps: number[], now: number, windowMs: number) =>
  timestamps.filter((timestamp) => now - timestamp <= windowMs);

const recordRateLimitedAction = (
  buckets: Map<string, number[]>,
  key: string,
  limit: number,
  windowMs: number,
  now: number,
) => {
  const current = sanitizeRollingWindow(buckets.get(key) ?? [], now, windowMs);
  if (current.length >= limit) {
    throw new DemoApiError("rate_limited", "Too many requests right now. Please try again soon.");
  }

  current.push(now);
  buckets.set(key, current);
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const assertAllowedUniversityEmail = (email: string) => {
  const normalized = normalizeEmail(email);
  const domain = normalized.split("@")[1];
  if (!domain || domain !== ALLOWED_EMAIL_DOMAIN) {
    throw new DemoApiError("invalid_email", `Use your @${ALLOWED_EMAIL_DOMAIN} account.`);
  }

  return normalized;
};

const toDisplayName = (email: string) =>
  email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const inferRoleFromEmail = (email: string): Person["primaryRole"] => {
  const localPart = email.split("@")[0];
  if (/(staff|faculty|prof|admin|dean|office)/i.test(localPart)) {
    return "staff";
  }

  return "student";
};

const nowIso = () => new Date().toISOString();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "proposition";

const getBaseCounts = (proposition: DemoPropositionRecord) => proposition.seedVotes ?? { approve: 0, reject: 0, abstain: 0 };

const getOverlayVotesForProposition = (state: DemoState, propositionId: string) =>
  [...state.votes.values()].filter((vote) => vote.propositionId === propositionId);

const getVoteCounts = (state: DemoState, proposition: DemoPropositionRecord) => {
  const counts = { ...getBaseCounts(proposition) };

  for (const vote of getOverlayVotesForProposition(state, proposition.id)) {
    counts[vote.choice] += 1;
  }

  const total = counts.approve + counts.reject + counts.abstain;
  return { ...counts, total };
};

const supportPercent = (approve: number, total: number) => (total > 0 ? (approve / total) * 100 : null);

const propositionStatus = (proposition: DemoPropositionRecord): PropositionStatus => {
  if (proposition.status === "closed") {
    return "closed";
  }

  const closesAtMs = Date.parse(proposition.closesAt);
  if (Number.isNaN(closesAtMs)) {
    return "open";
  }

  if (closesAtMs <= Date.now()) {
    return "closed";
  }

  if (closesAtMs - Date.now() <= CLOSING_SOON_WINDOW_MS) {
    return "closing_soon";
  }

  return "open";
};

const propositionOutcome = (turnoutCount: number, approveCount: number, rejectCount: number): PropositionOutcome => {
  if (turnoutCount === 0) {
    return "NO_RESULT";
  }

  if (approveCount > rejectCount) {
    return "APPROVED";
  }

  if (rejectCount > approveCount) {
    return "REJECTED";
  }

  return "TIED";
};

const toBreakdown = (counts: ReturnType<typeof getVoteCounts>): PropositionBreakdownItem[] =>
  ([
    { choice: "approve", label: "Approve", count: counts.approve },
    { choice: "reject", label: "Reject", count: counts.reject },
    { choice: "abstain", label: "Abstain", count: counts.abstain },
  ] as const).map((entry) => ({
    ...entry,
    share: counts.total > 0 ? (entry.count / counts.total) * 100 : 0,
  }));

const getSessionRecord = (state: DemoState, sessionId: string | null) => {
  if (!sessionId) {
    return null;
  }

  const record = state.sessions.get(sessionId);
  if (!record) {
    return null;
  }

  if (record.expiresAtMs <= Date.now()) {
    state.sessions.delete(sessionId);
    state.auditEvents.push(`session_expired:${record.person.id}:${Date.now()}`);
    return null;
  }

  record.session.updatedAt = nowIso();
  record.expiresAtMs = Date.now() + SESSION_TTL_MS;
  return record;
};

const getSessionResponse = (state: DemoState, sessionId: string | null): SessionResponse => {
  const record = getSessionRecord(state, sessionId);
  if (!record) {
    return {
      authenticated: false,
      session: null,
      person: null,
    };
  }

  return {
    authenticated: true,
    session: record.session,
    person: record.person,
  };
};

const sortDefault = (left: PropositionSummary, right: PropositionSummary) => {
  if (left.displayOrder !== right.displayOrder) {
    return left.displayOrder - right.displayOrder;
  }

  if (left.isUserPosted !== right.isUserPosted) {
    return left.isUserPosted ? 1 : -1;
  }

  return right.postedAt.localeCompare(left.postedAt);
};

const personalizedOrdering = (propositions: PropositionSummary[], person: Person | null, votes: VoteRecord[]) => {
  if (!person) {
    return propositions.sort(sortDefault);
  }

  const votedIds = new Set(votes.map((vote) => vote.propositionId));
  return [...propositions]
    .map((proposition) => {
      let score = 0;
      let reason: string | null = null;

      if (!votedIds.has(proposition.id)) {
        score += 3;
        reason = "You have not voted on this proposition yet.";
      }

      if (proposition.status === "closing_soon") {
        score += 4;
        reason = "Closes soon.";
      }

      if (person.primaryRole === "student" && /(student|housing|library|tuition|food|exam|campus)/i.test(proposition.category)) {
        score += 2;
        reason = reason ?? "Relevant to student life.";
      }

      if (person.primaryRole === "staff" && /(academic|budget|operations|faculty|campus)/i.test(proposition.category)) {
        score += 2;
        reason = reason ?? "Relevant to staff operations.";
      }

      return {
        proposition: {
          ...proposition,
          personalizationReason: reason,
        },
        score,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return sortDefault(left.proposition, right.proposition);
    })
    .map((entry) => entry.proposition);
};

const buildSummary = (
  state: DemoState,
  proposition: DemoPropositionRecord,
  person: Person | null,
): PropositionSummary => {
  const counts = getVoteCounts(state, proposition);

  return {
    id: proposition.id,
    slug: proposition.slug,
    jurisdictionSlug: proposition.jurisdictionSlug,
    path: proposition.path,
    jurisdiction: proposition.jurisdiction,
    category: proposition.category,
    title: proposition.title,
    status: propositionStatus(proposition),
    closesAt: proposition.closesAt,
    postedAt: proposition.postedAt,
    sponsor: proposition.sponsor,
    supportPercent: supportPercent(counts.approve, counts.total),
    turnoutCount: counts.total,
    displayOrder: proposition.displayOrder,
    isUserPosted: proposition.isUserPosted,
    personalizationReason: person ? null : null,
    aiGenerated: proposition.aiGenerated,
  };
};

const buildDetail = (state: DemoState, proposition: DemoPropositionRecord, person: Person | null): PropositionDetail => {
  const summary = buildSummary(state, proposition, person);
  const counts = getVoteCounts(state, proposition);
  const voteRecord = person ? state.votes.get(`${proposition.id}:${person.id}`) ?? null : null;

  return {
    ...summary,
    scope: proposition.scope,
    tldr: proposition.tldr,
    bullets: [...proposition.bullets],
    reviewChecks: cloneReviewChecks(proposition.reviewChecks),
    voteBreakdown: toBreakdown(counts),
    brief: proposition.brief,
    myVote: voteRecord,
    aiOrigin: proposition.aiOrigin,
  };
};

const listOpenSummaries = (state: DemoState, person: Person | null, mode: PropositionListMode): PropositionSummary[] => {
  const openPropositions = state.propositions
    .filter((proposition) => propositionStatus(proposition) !== "closed")
    .map((proposition) => buildSummary(state, proposition, person));

  if (mode === "for_you") {
    const personVotes = person
      ? [...state.votes.values()].filter((vote) => vote.personId === person.id)
      : [];
    return personalizedOrdering(openPropositions, person, personVotes);
  }

  return openPropositions.sort(sortDefault);
};

const listHistorySummaries = (state: DemoState): PropositionHistoryItem[] =>
  state.propositions
    .filter((proposition) => propositionStatus(proposition) === "closed")
    .map((proposition) => {
      const summary = buildSummary(state, proposition, null);
      const counts = getVoteCounts(state, proposition);

      return {
        ...summary,
        outcome: propositionOutcome(counts.total, counts.approve, counts.reject),
      };
    })
    .sort((left, right) => right.postedAt.localeCompare(left.postedAt));

const resolvePropositionByPath = (state: DemoState, path: string) =>
  state.propositions.find((proposition) => proposition.path === path) ?? null;

const responseHeadersForSession = (sessionId: string | null, authenticated: boolean) =>
  !authenticated && sessionId ? { "Set-Cookie": buildClearSessionCookie() } : {};

const sanitizeQuestion = (value: string) => value.replace(/\s+/g, " ").trim();

const generateExplanation = (proposition: DemoPropositionRecord, role: AiAudienceRole): PropositionAiExplanationResponse => {
  const advantages = proposition.bullets.slice(0, 2);
  const disadvantages =
    proposition.reviewChecks
      .filter((check) => check.status !== "PASS")
      .map((check) => `${check.name} needs closer review before implementation.`)
      .slice(0, 2);

  return {
    propositionId: proposition.id,
    role,
    requestedProvider: "auto",
    providerUsed: AI_PROVIDER_USED,
    cached: false,
    generatedAt: nowIso(),
    explanation: `${proposition.tldr} This summary is generated from the proposition text for the deployed hackathon demo.`,
    advantages,
    disadvantages:
      disadvantages.length > 0
        ? disadvantages
        : ["There are still tradeoffs around implementation details and how fast the change can be delivered."],
    impact: role === "student" ? "Focused on day-to-day student impact." : "Focused on operational and staff impact.",
    sourcesUsed: ["Bundled proposition text"],
  };
};

const generateChatAnswer = (
  proposition: DemoPropositionRecord,
  role: AiAudienceRole,
  question: string,
): PropositionAiChatResponse => ({
  propositionId: proposition.id,
  role,
  requestedProvider: "auto",
  providerUsed: AI_PROVIDER_USED,
  cached: false,
  generatedAt: nowIso(),
  question,
  answer: `Based on the current proposition text, ${proposition.tldr.toLowerCase()} ${role === "student" ? "From a student view," : "From a staff view,"} the main tradeoff is that ${proposition.reviewChecks
    .filter((check) => check.status !== "PASS")
    .map((check) => `${check.name.toLowerCase()} needs closer review`)
    .join(" and ") || "delivery details still need follow-through"}.`,
  sourcesUsed: ["Bundled proposition text"],
});

const deriveDraftFromSources = (
  state: DemoState,
  sourceIds: string[] | undefined,
): { sources: PropositionHistoryItem[]; rationale: string } => {
  const history = listHistorySummaries(state);
  const selected =
    sourceIds && sourceIds.length > 0
      ? history.filter((proposition) => sourceIds.includes(proposition.id))
      : selectAiDraftSourcePropositions(history, 3, [], { allowReuseWhenEmpty: true });

  if (selected.length < 2) {
    throw new DemoApiError("invalid_request", "Choose at least two closed policies to synthesize a new open policy.");
  }

  return {
    sources: selected,
    rationale: "This draft combines the strongest recent closed propositions into a single new proposition for the hackathon demo.",
  };
};

const buildAiDraft = (state: DemoState, sourceIds: string[] | undefined): PropositionAiDraftResponse => {
  const { sources, rationale } = deriveDraftFromSources(state, sourceIds);
  const title = `Combined ${sources[0].category} and ${sources[1].category} Proposal`;
  const slug = slugify(title);
  const propositionId = `ai-drafts:${slug}`;
  const sourceSummaries: PropositionAiSourceSummary[] = sources.map((source) => ({
    propositionId: source.id,
    title: source.title,
    path: source.path,
    supportPercent: source.supportPercent,
    turnoutCount: source.turnoutCount,
  }));

  const draft: PropositionDetail = {
    id: propositionId,
    slug,
    jurisdictionSlug: "ai-drafts",
    path: propositionPathFromParts("ai-drafts", slug),
    jurisdiction: "AI proposition builder",
    category: "Synthetic proposal",
    title,
    status: "open",
    closesAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    postedAt: nowIso(),
    sponsor: "AI suggested proposition builder",
    supportPercent: null,
    turnoutCount: 0,
    displayOrder: 9999,
    isUserPosted: false,
    personalizationReason: null,
    aiGenerated: true,
    scope: "University-wide",
    tldr: "A merged proposition built from the strongest recent closed results.",
    bullets: [
      "Combines the highest-signal closed propositions into one new vote.",
      "Preserves the strongest user-supported themes from the source results.",
      "Publishes as a fresh open proposition for new campus feedback.",
    ],
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "WARN" },
      { name: "Delivery", status: "WARN" },
    ],
    voteBreakdown: [],
    brief: `# ${title}\n\nThis is a demo AI-generated draft created from recent closed propositions.\n\n## Sources\n\n${sources
      .map((source) => `- ${source.title}`)
      .join("\n")}`,
    myVote: null,
    aiOrigin: {
      sourcePropositionId: sources[0].id,
      sourcePropositionTitle: sources[0].title,
      sourcePropositionPath: sources[0].path,
      sourceSupportPercent: sources[0].supportPercent,
      sourceTurnoutCount: sources[0].turnoutCount,
      sourcePropositionIds: sources.map((source) => source.id),
      sourcePropositions: sourceSummaries,
      rationale,
    },
  };

  return {
    sourcePropositionId: sources[0].id,
    sourcePropositionTitle: sources[0].title,
    sourcePropositionIds: sources.map((source) => source.id),
    sourcePropositionTitles: sources.map((source) => source.title),
    sourcePropositions: sourceSummaries,
    sourceSupportPercent: sources[0].supportPercent,
    sourceTurnoutCount: sources[0].turnoutCount,
    requestedProvider: "auto",
    providerUsed: AI_PROVIDER_USED,
    cached: false,
    generatedAt: nowIso(),
    rationale,
    proposition: draft,
  };
};

const getAiBuilderStatus = (state: DemoState): PropositionAiPolicyBuilderStatus => {
  const history = listHistorySummaries(state);
  const nextSources = selectAiDraftSourcePropositions(history, 3, [], { allowReuseWhenEmpty: true }).map((source) => ({
    propositionId: source.id,
    title: source.title,
    path: source.path,
    supportPercent: source.supportPercent,
    turnoutCount: source.turnoutCount,
  }));

  const activePolicies = state.propositions
    .filter((proposition) => proposition.aiGenerated && propositionStatus(proposition) !== "closed")
    .map((proposition) => ({
      propositionId: proposition.id,
      title: proposition.title,
      path: proposition.path,
      supportPercent: buildSummary(state, proposition, null).supportPercent,
      turnoutCount: buildSummary(state, proposition, null).turnoutCount,
      closesAt: proposition.closesAt,
    }));

  return {
    limit: 2,
    activeCount: activePolicies.length,
    activePolicies,
    nextSourcePropositions: nextSources,
    nextPublishAt: null,
    canPublishNow: false,
    waitingReason: "Automatic publishing is temporarily unavailable right now.",
  };
};

const getSecurityStatus = (state: DemoState): SecurityStatusResponse => ({
  generatedAt: nowIso(),
  sessionTtlHours: SESSION_TTL_MS / (60 * 60 * 1000),
  otpTtlMinutes: OTP_TTL_MS / (60 * 1000),
  otpMaxFailedAttempts: OTP_MAX_FAILED_ATTEMPTS,
  propositionSubmissionLimitPerPerson: PROPOSITION_SUBMISSION_LIMIT_PER_PERSON,
  propositionSubmissionLimitPerIp: PROPOSITION_SUBMISSION_LIMIT_PER_IP,
  controls: [
    {
      key: "auth",
      label: "Email verification",
      status: "active",
      detail: `University email verification codes are active for the demo deployment on @${ALLOWED_EMAIL_DOMAIN}.`,
    },
    {
      key: "votes",
      label: "Vote integrity",
      status: "active",
      detail: "The demo backend still enforces one stored vote per user per proposition.",
    },
    {
      key: "rate_limits",
      label: "Rate limits",
      status: "active",
      detail: "Sign-in requests and proposition posting are rate limited in the deployed demo runtime.",
    },
    {
      key: "storage",
      label: "Deployment storage",
      status: "warning",
      detail: "The Vercel hackathon backend uses in-memory state for reliability, so sessions, new propositions, and demo votes are temporary.",
    },
    {
      key: "email_delivery",
      label: "Email delivery",
      status: getEmailDeliveryMode() === "development" ? "warning" : "active",
      detail:
        getEmailDeliveryMode() === "development"
          ? "Email delivery is running in development-code mode. Configure SMTP or Resend for live code delivery."
          : "Email delivery is configured for live verification code sending.",
    },
  ],
  metrics: {
    activeRosterMembers: state.peopleByEmail.size,
    activeSessions: state.sessions.size,
    auditEventsLast24Hours: state.auditEvents.length,
    votesRecorded: state.votes.size + state.propositions.reduce((sum, proposition) => {
      const base = getBaseCounts(proposition);
      return sum + base.approve + base.reject + base.abstain;
    }, 0),
    openPropositions: state.propositions.filter((proposition) => propositionStatus(proposition) !== "closed").length,
    closedPropositions: state.propositions.filter((proposition) => propositionStatus(proposition) === "closed").length,
  },
});

const requestSignInCode = async (state: DemoState, emailInput: string, clientIp: string): Promise<RequestSignInCodeResponse> => {
  const email = assertAllowedUniversityEmail(emailInput);
  const now = Date.now();

  recordRateLimitedAction(state.authRequestsByEmail, email, AUTH_REQUEST_LIMIT_PER_EMAIL, AUTH_REQUEST_WINDOW_MS, now);
  recordRateLimitedAction(state.authRequestsByIp, clientIp, AUTH_REQUEST_LIMIT_PER_IP, AUTH_REQUEST_WINDOW_MS, now);

  const existing = state.codes.get(email);
  if (existing && Date.parse(existing.resendAvailableAt) > now) {
    throw new DemoApiError("rate_limited", "Please wait before requesting another code.");
  }

  const code = randomInt(100000, 1000000).toString();
  const expiresAt = new Date(now + OTP_TTL_MS).toISOString();
  const resendAvailableAt = new Date(now + OTP_RESEND_COOLDOWN_MS).toISOString();

  try {
    const { sendSignInCodeEmail } = await import("../server/email.ts");
    const delivery = await sendSignInCodeEmail(email, code);
    state.codes.set(email, {
      email,
      code,
      expiresAt,
      resendAvailableAt,
      failedAttempts: 0,
    });
    state.auditEvents.push(`auth_code_requested:${email}:${now}`);

    return {
      status: "sent",
      destination: email,
      expiresAt,
      resendAvailableAt,
      ...(delivery.mode === "development" ? { devCode: delivery.devCode } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to deliver a sign-in code right now.";
    throw new DemoApiError("delivery_failed", message);
  }
};

const verifySignInCode = (state: DemoState, emailInput: string, codeInput: string): VerifySignInCodeResponse => {
  const email = assertAllowedUniversityEmail(emailInput);
  const code = codeInput.trim();
  const record = state.codes.get(email);

  if (!record) {
    throw new DemoApiError("invalid_code", "Enter the 6-digit code.");
  }

  if (Date.parse(record.expiresAt) <= Date.now()) {
    state.codes.delete(email);
    throw new DemoApiError("code_expired", "That verification code expired. Request a fresh one.");
  }

  if (record.failedAttempts >= OTP_MAX_FAILED_ATTEMPTS) {
    state.codes.delete(email);
    throw new DemoApiError("invalid_code", "Too many failed attempts. Request a fresh code.");
  }

  if (record.code !== code) {
    record.failedAttempts += 1;
    throw new DemoApiError("invalid_code", "Enter the 6-digit code.");
  }

  state.codes.delete(email);

  let person = state.peopleByEmail.get(email);
  if (!person) {
    person = {
      id: `person_${slugify(email.replace("@", "_"))}`,
      displayName: toDisplayName(email),
      primaryRole: inferRoleFromEmail(email),
      createdAt: nowIso(),
    };
    state.peopleByEmail.set(email, person);
  }

  for (const [sessionId, session] of state.sessions.entries()) {
    if (session.person.id === person.id) {
      state.sessions.delete(sessionId);
    }
  }

  const session: SessionRecord = {
    id: randomUUID(),
    personId: person.id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  state.sessions.set(session.id, {
    session,
    person,
    email,
    expiresAtMs: Date.now() + SESSION_TTL_MS,
  });
  state.auditEvents.push(`auth_verified:${person.id}:${Date.now()}`);

  return {
    authenticated: true,
    session,
    person,
  };
};

const createProposition = (
  state: DemoState,
  sessionId: string | null,
  input: CreatePropositionInput,
  clientIp: string,
): CreatePropositionResponse => {
  const session = getSessionRecord(state, sessionId);
  if (!session) {
    throw new DemoApiError("authentication_required", "Sign in to post a proposition.");
  }

  if (
    typeof input.title !== "string" ||
    typeof input.category !== "string" ||
    typeof input.scope !== "string" ||
    typeof input.tldr !== "string" ||
    typeof input.brief !== "string" ||
    typeof input.closesAt !== "string" ||
    !Array.isArray(input.bullets) ||
    input.bullets.some((bullet) => typeof bullet !== "string")
  ) {
    throw new DemoApiError("invalid_request", "Enter valid proposition details.");
  }

  const now = Date.now();
  recordRateLimitedAction(
    state.submissionTimestampsByPerson,
    session.person.id,
    PROPOSITION_SUBMISSION_LIMIT_PER_PERSON,
    PROPOSITION_SUBMISSION_WINDOW_MS,
    now,
  );
  recordRateLimitedAction(
    state.submissionTimestampsByIp,
    clientIp,
    PROPOSITION_SUBMISSION_LIMIT_PER_IP,
    PROPOSITION_SUBMISSION_WINDOW_MS,
    now,
  );

  const jurisdictionSlug = "campus";
  let slug = slugify(input.title);
  let suffix = 2;
  while (state.propositions.some((proposition) => proposition.jurisdictionSlug === jurisdictionSlug && proposition.slug === slug)) {
    slug = `${slugify(input.title)}-${suffix}`;
    suffix += 1;
  }

  const proposition: DemoPropositionRecord = {
    id: `${jurisdictionSlug}:${slug}`,
    slug,
    jurisdictionSlug,
    jurisdiction: "Campus community",
    category: input.category.trim(),
    title: input.title.trim(),
    status: "open",
    closesAt: input.closesAt,
    postedAt: nowIso(),
    sponsor: session.person.displayName,
    scope: input.scope.trim(),
    tldr: input.tldr.trim(),
    bullets: input.bullets.map((bullet) => bullet.trim()).filter(Boolean).slice(0, 6),
    reviewChecks: [
      { name: "Rights", status: "PASS" },
      { name: "Budget", status: "WARN" },
      { name: "Delivery", status: "WARN" },
    ],
    brief: input.brief.trim(),
    displayOrder:
      Math.max(
        0,
        ...state.propositions.map((item) => item.displayOrder),
      ) + 100,
    path: propositionPathFromParts(jurisdictionSlug, slug),
    seedVotes: {
      approve: 0,
      reject: 0,
      abstain: 0,
    },
    voteHistory: [
      {
        capturedAt: nowIso(),
        approve: 0,
        reject: 0,
        abstain: 0,
      },
    ],
    aiGenerated: false,
    aiOrigin: null,
    isUserPosted: true,
  };

  state.propositions.push(proposition);
  state.auditEvents.push(`proposition_created:${proposition.id}:${session.person.id}:${Date.now()}`);

  return {
    proposition: buildDetail(state, proposition, session.person),
  };
};

const submitVote = (state: DemoState, sessionId: string | null, propositionId: string, choice: VoteChoice): SubmitVoteResponse => {
  const session = getSessionRecord(state, sessionId);
  if (!session) {
    throw new DemoApiError("authentication_required", "Sign in to vote.");
  }

  const proposition = state.propositions.find((candidate) => candidate.id === propositionId);
  if (!proposition) {
    throw new DemoApiError("proposition_not_found", "That proposition could not be found.");
  }

  if (propositionStatus(proposition) === "closed") {
    throw new DemoApiError("policy_closed", "This proposition is closed.");
  }

  const key = `${proposition.id}:${session.person.id}`;
  const existing = state.votes.get(key);
  const timestamp = nowIso();
  const vote: VoteRecord = {
    id: existing?.id ?? randomUUID(),
    propositionId: proposition.id,
    personId: session.person.id,
    choice,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  state.votes.set(key, vote);
  state.auditEvents.push(`vote_${existing ? "updated" : "created"}:${proposition.id}:${session.person.id}:${Date.now()}`);

  return {
    action: existing ? "updated" : "created",
    vote,
  };
};

const getVoteHistory = (state: DemoState, propositionId: string): PropositionVoteHistoryResponse => {
  const proposition = state.propositions.find((candidate) => candidate.id === propositionId);
  if (!proposition) {
    throw new DemoApiError("proposition_not_found", "That proposition could not be found.");
  }

  const points = (proposition.voteHistory ?? []).map((point) => {
    const turnoutCount = point.approve + point.reject + point.abstain;
    return {
      capturedAt: point.capturedAt,
      approveCount: point.approve,
      rejectCount: point.reject,
      abstainCount: point.abstain,
      turnoutCount,
      approveShare: turnoutCount > 0 ? (point.approve / turnoutCount) * 100 : 0,
      rejectShare: turnoutCount > 0 ? (point.reject / turnoutCount) * 100 : 0,
      abstainShare: turnoutCount > 0 ? (point.abstain / turnoutCount) * 100 : 0,
    } satisfies PropositionVoteHistoryPoint;
  });

  const current = getVoteCounts(state, proposition);
  const last = points.at(-1);
  const lastMatchesCurrent =
    last &&
    last.approveCount === current.approve &&
    last.rejectCount === current.reject &&
    last.abstainCount === current.abstain;

  if (!lastMatchesCurrent) {
    points.push({
      capturedAt: nowIso(),
      approveCount: current.approve,
      rejectCount: current.reject,
      abstainCount: current.abstain,
      turnoutCount: current.total,
      approveShare: current.total > 0 ? (current.approve / current.total) * 100 : 0,
      rejectShare: current.total > 0 ? (current.reject / current.total) * 100 : 0,
      abstainShare: current.total > 0 ? (current.abstain / current.total) * 100 : 0,
    });
  }

  return {
    propositionId,
    points,
  };
};

export const createVercelDemoFetchHandler = () => {
  return async (request: Request) => {
    const state = getState();
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        return json({ ok: true, mode: "vercel_demo" });
      }

      if (request.method === "GET" && url.pathname === "/api/me") {
        const sessionId = readSessionCookie(request);
        const payload = getSessionResponse(state, sessionId);
        return json(payload, 200, responseHeadersForSession(sessionId, payload.authenticated));
      }

      if (request.method === "GET" && url.pathname === "/api/propositions") {
        const sessionId = readSessionCookie(request);
        const session = getSessionRecord(state, sessionId);
        const mode = (url.searchParams.get("mode") ?? "default") as PropositionListMode;
        if (mode !== "default" && mode !== "for_you") {
          throw new DemoApiError("invalid_request", "Choose a valid proposition list mode.");
        }

        const propositions = listOpenSummaries(state, session?.person ?? null, mode);
        return json({ propositions } satisfies PropositionListResponse);
      }

      if (request.method === "POST" && url.pathname === "/api/propositions") {
        const body = await parseJson<CreatePropositionInput>(request);
        return json(createProposition(state, readSessionCookie(request), body, readClientAddress(request)));
      }

      if (request.method === "GET" && url.pathname === "/api/propositions/history") {
        return json({ propositions: listHistorySummaries(state) } satisfies PropositionHistoryResponse);
      }

      if (request.method === "GET" && url.pathname === "/api/ai/policy-builder-status") {
        return json(getAiBuilderStatus(state));
      }

      if (request.method === "GET" && url.pathname === "/api/security/status") {
        return json(getSecurityStatus(state));
      }

      if (request.method === "GET" && url.pathname === "/api/propositions/by-path") {
        const propositionPath = url.searchParams.get("path");
        if (!propositionPath) {
          throw new DemoApiError("invalid_request", "A proposition path is required.");
        }

        const proposition = resolvePropositionByPath(state, propositionPath);
        if (!proposition) {
          throw new DemoApiError("proposition_not_found", "That proposition could not be found.");
        }

        const session = getSessionRecord(state, readSessionCookie(request));
        return json({ proposition: buildDetail(state, proposition, session?.person ?? null) } satisfies PropositionDetailResponse);
      }

      const propositionHistoryMatch = url.pathname.match(/^\/api\/propositions\/([^/]+)\/vote-history$/);
      if (propositionHistoryMatch && request.method === "GET") {
        return json(getVoteHistory(state, decodeURIComponent(propositionHistoryMatch[1])));
      }

      const propositionExplanationMatch = url.pathname.match(/^\/api\/propositions\/([^/]+)\/explanation$/);
      if (propositionExplanationMatch && request.method === "POST") {
        const body = await parseJson<PropositionAiExplanationRequest>(request);
        const session = getSessionRecord(state, readSessionCookie(request));
        if (!session) {
          throw new DemoApiError("authentication_required", "Sign in to use the AI explainer.");
        }

        const proposition = state.propositions.find((candidate) => candidate.id === decodeURIComponent(propositionExplanationMatch[1]));
        if (!proposition) {
          throw new DemoApiError("proposition_not_found", "That proposition could not be found.");
        }

        if (body.role !== "student" && body.role !== "staff") {
          throw new DemoApiError("invalid_request", "Choose a valid audience role.");
        }

        return json(generateExplanation(proposition, body.role));
      }

      const propositionChatMatch = url.pathname.match(/^\/api\/propositions\/([^/]+)\/chat$/);
      if (propositionChatMatch && request.method === "POST") {
        const body = await parseJson<PropositionAiChatRequest>(request);
        const session = getSessionRecord(state, readSessionCookie(request));
        if (!session) {
          throw new DemoApiError("authentication_required", "Sign in to use the AI explainer.");
        }

        const proposition = state.propositions.find((candidate) => candidate.id === decodeURIComponent(propositionChatMatch[1]));
        if (!proposition) {
          throw new DemoApiError("proposition_not_found", "That proposition could not be found.");
        }

        if (body.role !== "student" && body.role !== "staff") {
          throw new DemoApiError("invalid_request", "Choose a valid audience role.");
        }

        const question = sanitizeQuestion(body.question);
        if (!question) {
          throw new DemoApiError("invalid_request", "Ask a question to continue.");
        }

        return json(generateChatAnswer(proposition, body.role, question));
      }

      const propositionDraftMatch = url.pathname.match(/^\/api\/propositions\/([^/]+)\/ai-draft$/);
      if (propositionDraftMatch && request.method === "POST") {
        const session = getSessionRecord(state, readSessionCookie(request));
        if (!session) {
          throw new DemoApiError("authentication_required", "Sign in to use the AI proposition builder.");
        }

        const body = await parseJson<PropositionAiDraftRequest>(request);
        return json(buildAiDraft(state, body.sourcePropositionIds));
      }

      const propositionVoteMatch = url.pathname.match(/^\/api\/propositions\/([^/]+)\/vote$/);
      if (propositionVoteMatch && request.method === "POST") {
        const body = await parseJson<{ choice?: VoteChoice }>(request);
        if (body.choice !== "approve" && body.choice !== "reject" && body.choice !== "abstain") {
          throw new DemoApiError("invalid_vote_choice", "A valid vote choice is required.");
        }

        return json(submitVote(state, readSessionCookie(request), decodeURIComponent(propositionVoteMatch[1]), body.choice));
      }

      if (request.method === "POST" && url.pathname === "/api/auth/request-code") {
        const body = await parseJson<RequestSignInCodeInput>(request);
        if (typeof body.email !== "string") {
          throw new DemoApiError("invalid_email", "Enter your university email.");
        }

        return json(await requestSignInCode(state, body.email, readClientAddress(request)));
      }

      if (request.method === "POST" && url.pathname === "/api/auth/verify-code") {
        const body = await parseJson<VerifySignInCodeInput>(request);
        if (typeof body.email !== "string") {
          throw new DemoApiError("invalid_email", "Enter your university email.");
        }

        if (typeof body.code !== "string") {
          throw new DemoApiError("invalid_code", "Enter the 6-digit code.");
        }

        const payload = verifySignInCode(state, body.email, body.code);
        return json(payload, 200, {
          "Set-Cookie": buildSessionCookie(payload.session.id),
        });
      }

      if (request.method === "POST" && url.pathname === "/api/auth/sign-out") {
        const sessionId = readSessionCookie(request);
        if (sessionId) {
          state.sessions.delete(sessionId);
        }

        const response: SignOutResponse = { success: true };
        return json(response, 200, {
          "Set-Cookie": buildClearSessionCookie(),
        });
      }

      return json({ error: { code: "not_found", message: "Route not found." } }, 404);
    } catch (error) {
      return errorResponse(error);
    }
  };
};
