import type {
  RequestSignInCodeInput,
  RequestSignInCodeResponse,
  SessionResponse,
  SignOutResponse,
  SubmitVoteResponse,
  VerifySignInCodeInput,
  VerifySignInCodeResponse,
  VoteStatusResponse,
} from "@/lib/voting";
import { VotingApiError } from "@/lib/voting";
import type { VoteChoice } from "@/lib/ballotItems";

const API_BASE = "/api";
export const sessionQueryKey = ["session"] as const;

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
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as T;
};

export const getSession = () => request<SessionResponse>("/me", { method: "GET" });

export const getVoteStatus = (policyId: string) =>
  request<VoteStatusResponse>(`/policies/${encodeURIComponent(policyId)}/vote`, { method: "GET" });

export const submitVote = (policyId: string, choice: VoteChoice) =>
  request<SubmitVoteResponse>(`/policies/${encodeURIComponent(policyId)}/vote`, {
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
