export type VoteChoice = "approve" | "reject" | "abstain";
export type ReviewStatus = "PASS" | "WARN" | "FAIL";
export type PropositionStatus = "open" | "closing_soon" | "draft" | "closed";
export type PropositionOutcome = "APPROVED" | "REJECTED" | "TIED" | "NO_RESULT";
export type PropositionListMode = "default" | "for_you";
export type AiAudienceRole = "student" | "staff";
export type AiProviderPreference = "auto" | "openai" | "gemini" | "grok";
export type AiProviderUsed = "openai" | "gemini" | "grok" | "fallback";

export type Person = {
  id: string;
  displayName: string;
  primaryRole: "student" | "staff" | "dual";
  createdAt: string;
};

export type SessionRecord = {
  id: string;
  personId: string;
  createdAt: string;
  updatedAt: string;
};

export type VoteRecord = {
  id: string;
  propositionId: string;
  personId: string;
  choice: VoteChoice;
  createdAt: string;
  updatedAt: string;
};

export type PropositionBreakdownItem = {
  choice: VoteChoice;
  label: string;
  share: number;
  count: number;
};

export type PropositionVoteHistoryPoint = {
  capturedAt: string;
  approveCount: number;
  rejectCount: number;
  abstainCount: number;
  turnoutCount: number;
  approveShare: number;
  rejectShare: number;
  abstainShare: number;
};

export type PropositionReviewCheck = {
  name: string;
  status: ReviewStatus;
};

export type PropositionSummary = {
  id: string;
  slug: string;
  jurisdictionSlug: string;
  path: string;
  jurisdiction: string;
  category: string;
  title: string;
  status: PropositionStatus;
  closesAt: string;
  postedAt: string;
  sponsor: string;
  supportPercent: number | null;
  turnoutCount: number;
  displayOrder: number;
  isUserPosted: boolean;
  personalizationReason: string | null;
  aiGenerated: boolean;
};

export type PropositionAiSourceSummary = {
  propositionId: string;
  title: string;
  path: string;
  supportPercent: number | null;
  turnoutCount: number;
};

export type PropositionAiActiveSummary = PropositionAiSourceSummary & {
  closesAt: string;
};

export type PropositionAiOrigin = {
  sourcePropositionId: string;
  sourcePropositionTitle: string;
  sourcePropositionPath: string;
  sourceSupportPercent: number | null;
  sourceTurnoutCount: number;
  sourcePropositionIds: string[];
  sourcePropositions: PropositionAiSourceSummary[];
  rationale: string;
};

export type PropositionDetail = PropositionSummary & {
  scope: string;
  tldr: string;
  bullets: string[];
  reviewChecks: PropositionReviewCheck[];
  voteBreakdown: PropositionBreakdownItem[];
  brief: string;
  myVote: VoteRecord | null;
  aiOrigin: PropositionAiOrigin | null;
};

export type PropositionHistoryItem = PropositionSummary & {
  outcome: PropositionOutcome;
};

export type PropositionAiExplanation = {
  propositionId: string;
  role: AiAudienceRole;
  requestedProvider: AiProviderPreference;
  providerUsed: AiProviderUsed;
  cached: boolean;
  generatedAt: string;
  explanation: string;
  advantages: string[];
  disadvantages: string[];
  impact: string;
  sourcesUsed: string[];
};

export type PropositionListResponse = {
  propositions: PropositionSummary[];
};

export type PropositionHistoryResponse = {
  propositions: PropositionHistoryItem[];
};

export type PropositionDetailResponse = {
  proposition: PropositionDetail;
};

export type PropositionVoteHistoryResponse = {
  propositionId: string;
  points: PropositionVoteHistoryPoint[];
};

export type CreatePropositionInput = {
  title: string;
  category: string;
  scope: string;
  tldr: string;
  bullets: string[];
  brief: string;
  closesAt: string;
};

export type CreatePropositionResponse = {
  proposition: PropositionDetail;
};

export type PropositionAiExplanationRequest = {
  role: AiAudienceRole;
  provider?: AiProviderPreference;
};

export type PropositionAiExplanationResponse = PropositionAiExplanation;

export type PropositionAiChatRequest = {
  role: AiAudienceRole;
  provider?: AiProviderPreference;
  question: string;
};

export type PropositionAiChatResponse = {
  propositionId: string;
  role: AiAudienceRole;
  requestedProvider: AiProviderPreference;
  providerUsed: AiProviderUsed;
  cached: boolean;
  generatedAt: string;
  question: string;
  answer: string;
  sourcesUsed: string[];
};

export type PropositionAiDraftRequest = {
  provider?: AiProviderPreference;
  sourcePropositionIds?: string[];
};

export type PropositionAiDraftResponse = {
  sourcePropositionId: string;
  sourcePropositionTitle: string;
  sourcePropositionIds: string[];
  sourcePropositionTitles: string[];
  sourcePropositions: PropositionAiSourceSummary[];
  sourceSupportPercent: number | null;
  sourceTurnoutCount: number;
  requestedProvider: AiProviderPreference;
  providerUsed: AiProviderUsed;
  cached: boolean;
  generatedAt: string;
  rationale: string;
  proposition: PropositionDetail;
};

export type PropositionAiPolicyBuilderStatus = {
  limit: number;
  activeCount: number;
  activePolicies: PropositionAiActiveSummary[];
  nextSourcePropositions: PropositionAiSourceSummary[];
  nextPublishAt: string | null;
  canPublishNow: boolean;
  waitingReason: string | null;
};

export type SecurityControlStatus = "active" | "warning";

export type SecurityControl = {
  key: string;
  label: string;
  status: SecurityControlStatus;
  detail: string;
};

export type SecurityStatusResponse = {
  generatedAt: string;
  sessionTtlHours: number;
  otpTtlMinutes: number;
  otpMaxFailedAttempts: number;
  propositionSubmissionLimitPerPerson: number;
  propositionSubmissionLimitPerIp: number;
  controls: SecurityControl[];
  metrics: {
    activeRosterMembers: number;
    activeSessions: number;
    auditEventsLast24Hours: number;
    votesRecorded: number;
    openPropositions: number;
    closedPropositions: number;
  };
};

export type AuthenticatedSessionResponse = {
  authenticated: true;
  session: SessionRecord;
  person: Person;
};

export type AnonymousSessionResponse = {
  authenticated: false;
  session: null;
  person: null;
};

export type SessionResponse = AuthenticatedSessionResponse | AnonymousSessionResponse;

export type SubmitVoteResponse = {
  action: "created" | "updated";
  vote: VoteRecord;
};

export type RequestSignInCodeInput = {
  email: string;
};

export type RequestSignInCodeResponse = {
  status: "sent";
  destination: string;
  expiresAt: string;
  resendAvailableAt: string;
  devCode?: string;
};

export type VerifySignInCodeInput = {
  email: string;
  code: string;
};

export type VerifySignInCodeResponse = AuthenticatedSessionResponse;

export type SignOutResponse = {
  success: true;
};

export class VotingApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "VotingApiError";
    this.status = status;
    this.code = code;
  }
}

const sortPropositionByPolicyImpact = (left: PropositionHistoryItem, right: PropositionHistoryItem) => {
  const leftSupport = left.supportPercent ?? -1;
  const rightSupport = right.supportPercent ?? -1;

  if (rightSupport !== leftSupport) {
    return rightSupport - leftSupport;
  }

  if (right.turnoutCount !== left.turnoutCount) {
    return right.turnoutCount - left.turnoutCount;
  }

  const leftPostedAt = Date.parse(left.postedAt);
  const rightPostedAt = Date.parse(right.postedAt);
  if (rightPostedAt !== leftPostedAt) {
    return rightPostedAt - leftPostedAt;
  }

  return left.title.localeCompare(right.title);
};

export const selectAiDraftSourcePropositions = (
  propositions: PropositionHistoryItem[],
  maxSources = 3,
  excludedIds: string[] = [],
  options: { allowReuseWhenEmpty?: boolean } = {},
) =>
  (() => {
    const selectEligible = (ignoreExcludedIds: boolean) =>
      [...propositions]
        .filter(
          (proposition) =>
            proposition.status === "closed" &&
            !proposition.aiGenerated &&
            (ignoreExcludedIds || !excludedIds.includes(proposition.id)),
        )
        .sort(sortPropositionByPolicyImpact)
        .slice(0, maxSources);

    const selected = selectEligible(false);
    if (selected.length > 0 || !options.allowReuseWhenEmpty) {
      return selected;
    }

    return selectEligible(true);
  })();

export const isApiUnavailableError = (error: unknown) =>
  error instanceof VotingApiError && error.code === "api_unavailable";

export const propositionIdFromParts = (jurisdictionSlug: string, slug: string) => `${jurisdictionSlug}:${slug}`;

export const propositionPathFromParts = (jurisdictionSlug: string, slug: string) => `/${jurisdictionSlug}/${slug}`;

export const formatSupportPercent = (value: number | null) => (value === null ? "--" : `${value.toFixed(1)}%`);

export const formatTurnout = (value: number) => `${value.toLocaleString()} vote${value === 1 ? "" : "s"}`;

export const formatCompactCount = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toString();
};
