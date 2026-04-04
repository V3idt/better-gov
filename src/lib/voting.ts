export type VoteChoice = "approve" | "reject" | "abstain";
export type ReviewStatus = "PASS" | "WARN" | "FAIL";
export type PropositionStatus = "open" | "closing_soon" | "draft" | "closed";
export type PropositionOutcome = "APPROVED" | "REJECTED" | "TIED" | "NO_RESULT";

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
};

export type PropositionDetail = PropositionSummary & {
  scope: string;
  tldr: string;
  bullets: string[];
  reviewChecks: PropositionReviewCheck[];
  voteBreakdown: PropositionBreakdownItem[];
  brief: string;
  myVote: VoteRecord | null;
};

export type PropositionHistoryItem = PropositionSummary & {
  outcome: PropositionOutcome;
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
