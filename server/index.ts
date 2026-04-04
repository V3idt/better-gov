import {
  buildClearSessionCookie,
  buildSessionCookie,
  getSession,
  getVoteStatus,
  openVotingDatabase,
  requestSignInCode,
  SESSION_COOKIE_NAME,
  signOut,
  submitVote,
  verifySignInCode,
  VotingDatabaseError,
} from "./db.ts";
import type { RequestSignInCodeInput, VerifySignInCodeInput } from "../src/lib/voting.ts";
import type { VoteChoice } from "../src/lib/ballotItems.ts";

const port = Number(process.env.BETTER_GOV_API_PORT ?? "8787");
const db = openVotingDatabase();

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });

const readSessionCookie = (request: Request) => {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const parseJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new VotingDatabaseError("invalid_request", "Request body must be valid JSON.");
  }
};

const errorResponse = (error: unknown, headers: HeadersInit = {}) => {
  if (error instanceof VotingDatabaseError) {
    const statusByCode: Record<VotingDatabaseError["code"], number> = {
      authentication_required: 401,
      invalid_email: 400,
      invalid_code: 400,
      code_expired: 410,
      rate_limited: 429,
      policy_not_found: 404,
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

  const message = error instanceof Error ? error.message : "Unknown error";
  return json(
    {
      error: {
        code: "internal_error",
        message,
      },
    },
    500,
    headers,
  );
};

const handleVoteStatus = (request: Request, policyId: string) => {
  try {
    const payload = getVoteStatus(db, readSessionCookie(request), policyId);
    return json(payload);
  } catch (error) {
    return errorResponse(error);
  }
};

const handleSubmitVote = async (request: Request, policyId: string) => {
  try {
    const body = await parseJson<{ choice?: VoteChoice }>(request);

    if (body.choice !== "approve" && body.choice !== "reject" && body.choice !== "abstain") {
      throw new VotingDatabaseError("invalid_vote_choice", "A valid vote choice is required.");
    }

    const payload = submitVote(db, readSessionCookie(request), policyId, body.choice);
    return json(payload);
  } catch (error) {
    return errorResponse(error);
  }
};

const handleRequestCode = async (request: Request) => {
  try {
    const body = await parseJson<RequestSignInCodeInput>(request);
    const payload = requestSignInCode(db, body.email);
    return json(payload, 200);
  } catch (error) {
    return errorResponse(error);
  }
};

const handleVerifyCode = async (request: Request) => {
  try {
    const body = await parseJson<VerifySignInCodeInput>(request);
    const payload = verifySignInCode(db, body.email, body.code);
    return json(payload, 200, {
      "Set-Cookie": buildSessionCookie(payload.session.id),
    });
  } catch (error) {
    return errorResponse(error);
  }
};

const handleSignOut = (request: Request) => {
  try {
    const payload = signOut(db, readSessionCookie(request));
    return json(payload, 200, {
      "Set-Cookie": buildClearSessionCookie(),
    });
  } catch (error) {
    return errorResponse(error);
  }
};

const server = Bun.serve({
  port,
  fetch: async (request) => {
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        return json({ ok: true });
      }

      if (request.method === "GET" && url.pathname === "/api/me") {
        const sessionId = readSessionCookie(request);
        const payload = getSession(db, sessionId);
        return json(
          payload,
          200,
          !payload.authenticated && sessionId ? { "Set-Cookie": buildClearSessionCookie() } : {},
        );
      }

      const voteMatch = url.pathname.match(/^\/api\/policies\/([^/]+)\/vote$/);
      if (voteMatch && request.method === "GET") {
        return handleVoteStatus(request, decodeURIComponent(voteMatch[1]));
      }

      if (voteMatch && request.method === "POST") {
        return await handleSubmitVote(request, decodeURIComponent(voteMatch[1]));
      }

      if (request.method === "POST" && url.pathname === "/api/auth/request-code") {
        return await handleRequestCode(request);
      }

      if (request.method === "POST" && url.pathname === "/api/auth/verify-code") {
        return await handleVerifyCode(request);
      }

      if (request.method === "POST" && url.pathname === "/api/auth/sign-out") {
        return handleSignOut(request);
      }

      return json({ error: { code: "not_found", message: "Route not found." } }, 404);
    } catch (error) {
      return errorResponse(error);
    }
  },
});

console.log(`better-gov api running on http://127.0.0.1:${server.port}`);

const shutdown = () => {
  server.stop(true);
  db.close();
};

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
