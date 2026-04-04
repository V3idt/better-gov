import type {
  CreatePropositionInput,
  CreatePropositionResponse,
  PropositionDetailResponse,
  PropositionAiExplanationRequest,
  PropositionAiChatRequest,
  PropositionAiChatResponse,
  PropositionAiDraftRequest,
  PropositionAiDraftResponse,
  PropositionAiExplanationResponse,
  PropositionAiPolicyBuilderStatus,
  PropositionHistoryResponse,
  PropositionListMode,
  PropositionListResponse,
  PropositionVoteHistoryResponse,
  RequestSignInCodeInput,
  RequestSignInCodeResponse,
  SessionResponse,
  SignOutResponse,
  SubmitVoteResponse,
  VerifySignInCodeInput,
  VerifySignInCodeResponse,
  VoteChoice,
} from "@/lib/voting";
import { VotingApiError } from "@/lib/voting";

const API_BASE = "/api";
export const sessionQueryKey = ["session"] as const;
export const propositionListQueryKey = ["propositions"] as const;
export const propositionListModeQueryKey = (mode: PropositionListMode) => ["propositions", mode] as const;
export const propositionHistoryQueryKey = ["propositions", "history"] as const;
export const propositionVoteHistoryQueryKey = (propositionId: string) =>
  ["proposition", propositionId, "vote-history"] as const;
export const propositionAiQueryKey = (propositionId: string, role: string, provider: string) =>
  ["proposition", propositionId, "ai", role, provider] as const;
export const aiPolicyBuilderStatusQueryKey = ["ai", "policy-builder", "status"] as const;

const parseError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: { code?: string; message?: string } };
    return new VotingApiError(
      response.status,
      payload.error?.code ?? "unknown_error",
      payload.error?.message ?? (response.statusText || "Request failed"),
    );
  } catch {
    return new VotingApiError(response.status, "unknown_error", response.statusText || "Request failed");
  }
};

const request = async <T>(path: string, init?: RequestInit) => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch {
    throw new VotingApiError(
      503,
      "api_unavailable",
      "The service is temporarily unavailable. Please try again.",
    );
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as T;
};

export const getSession = () => request<SessionResponse>("/me", { method: "GET" });

export const listPropositions = (mode: PropositionListMode = "default") =>
  request<PropositionListResponse>(`/propositions?mode=${encodeURIComponent(mode)}`, { method: "GET" });

export const listPropositionHistory = () => request<PropositionHistoryResponse>("/propositions/history", { method: "GET" });

export const createProposition = (input: CreatePropositionInput) =>
  request<CreatePropositionResponse>("/propositions", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getPropositionByPath = (path: string) =>
  request<PropositionDetailResponse>(`/propositions/by-path?path=${encodeURIComponent(path)}`, { method: "GET" });

export const getPropositionVoteHistory = (propositionId: string) =>
  request<PropositionVoteHistoryResponse>(`/propositions/${encodeURIComponent(propositionId)}/vote-history`, {
    method: "GET",
  });

export const getPropositionAiExplanation = (
  propositionId: string,
  input: PropositionAiExplanationRequest,
) =>
  request<PropositionAiExplanationResponse>(`/propositions/${encodeURIComponent(propositionId)}/explanation`, {
    method: "POST",
    body: JSON.stringify({
      role: input.role,
      ...(input.provider ? { provider: input.provider } : {}),
    }),
  });

export const getPropositionAiChatAnswer = (
  propositionId: string,
  input: PropositionAiChatRequest,
) =>
  request<PropositionAiChatResponse>(`/propositions/${encodeURIComponent(propositionId)}/chat`, {
    method: "POST",
    body: JSON.stringify({
      role: input.role,
      question: input.question,
      ...(input.provider ? { provider: input.provider } : {}),
    }),
  });

export const createPropositionAiDraft = (
  propositionId: string,
  input: PropositionAiDraftRequest,
) =>
  request<PropositionAiDraftResponse>(`/propositions/${encodeURIComponent(propositionId)}/ai-draft`, {
    method: "POST",
    body: JSON.stringify({
      ...(input.provider ? { provider: input.provider } : {}),
      ...(input.sourcePropositionIds ? { sourcePropositionIds: input.sourcePropositionIds } : {}),
    }),
  });

export const getAiPolicyBuilderStatus = () =>
  request<PropositionAiPolicyBuilderStatus>("/ai/policy-builder-status", { method: "GET" });

export const submitVote = (propositionId: string, choice: VoteChoice) =>
  request<SubmitVoteResponse>(`/propositions/${encodeURIComponent(propositionId)}/vote`, {
    method: "POST",
    body: JSON.stringify({ choice }),
  });

export const requestSignInCode = (input: RequestSignInCodeInput) =>
  request<RequestSignInCodeResponse>("/auth/request-code", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const verifySignInCode = (input: VerifySignInCodeInput) =>
  request<VerifySignInCodeResponse>("/auth/verify-code", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const signOut = () =>
  request<SignOutResponse>("/auth/sign-out", {
    method: "POST",
  });
