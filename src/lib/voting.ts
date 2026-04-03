import type { BallotItem, VoteChoice } from "@/lib/ballotItems";

export type { VoteChoice } from "@/lib/ballotItems";

export type IdentitySourceType = "student_id" | "staff_id" | "email_otp";

export type IdentitySource = {
  type: IdentitySourceType;
  value: string;
  verifiedAt: string;
};

export type Person = {
  id: string;
  displayName: string;
  primaryRole: "student" | "staff" | "dual";
  createdAt: string;
};

export type PolicyStatus = "open" | "closed" | "draft";

export type PolicyRecord = {
  id: string;
  slug: string;
  jurisdictionSlug: string;
  title: string;
  status: PolicyStatus;
  closesAt: string;
  sourcePath: string;
  createdAt: string;
  updatedAt: string;
};

export type VoteRecord = {
  id: string;
  policyId: string;
  personId: string;
  choice: VoteChoice;
  createdAt: string;
  updatedAt: string;
};

export type SessionRecord = {
  id: string;
  personId: string;
  createdAt: string;
  updatedAt: string;
};

export type VoteStatusResponse = {
  person: Person;
  identitySources: IdentitySource[];
  policy: PolicyRecord;
  vote: VoteRecord | null;
};

export type SessionResponse = {
  session: SessionRecord;
  person: Person;
  identitySources: IdentitySource[];
};

export type SubmitVoteResponse = {
  action: "created" | "updated";
  vote: VoteRecord;
};

export type VerifyIdentityInput = {
  studentId?: string;
  staffId?: string;
  emailOtp?: string;
  displayName?: string;
};

export type VerifyIdentityResponse = SessionResponse;

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
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

export const policyIdFromParts = (jurisdictionSlug: string, slug: string) => `${jurisdictionSlug}:${slug}`;

export const policyIdForItem = (item: Pick<BallotItem, "jurisdictionSlug" | "slug">) =>
  policyIdFromParts(item.jurisdictionSlug, item.slug);

export const policyStatusFromBallotStatus = (status: BallotItem["status"]): PolicyStatus => {
  if (status === "Draft") {
    return "draft";
  }

  if (status === "Closing Soon") {
    return "open";
  }

  return "open";
};
