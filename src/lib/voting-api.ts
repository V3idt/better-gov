import type {
  PropositionDetailResponse,
  PropositionHistoryResponse,
  PropositionListResponse,
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
export const propositionHistoryQueryKey = ["propositions", "history"] as const;

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
      "The account service is not running. Start the app with `npm run dev`, or run `npm run dev:api` alongside the web server.",
    );
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as T;
};

export const getSession = () => request<SessionResponse>("/me", { method: "GET" });

export const listPropositions = () => request<PropositionListResponse>("/propositions", { method: "GET" });

export const listPropositionHistory = () => request<PropositionHistoryResponse>("/propositions/history", { method: "GET" });

export const getPropositionByPath = (path: string) =>
  request<PropositionDetailResponse>(`/propositions/by-path?path=${encodeURIComponent(path)}`, { method: "GET" });

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
