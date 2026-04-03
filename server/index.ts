import { openVotingDatabase, getResolvedSession, getVoteStatus, submitVote, verifyIdentity, buildSessionCookie, VotingDatabaseError, SESSION_COOKIE_NAME } from "./db.ts";
import type { VerifyIdentityInput } from "../src/lib/voting.ts";
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
      policy_not_found: 404,
      policy_closed: 409,
      invalid_identity: 400,
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

const withSessionHeaders = (headers: HeadersInit, setCookie?: string) =>
  setCookie ? { ...headers, "Set-Cookie": setCookie } : headers;

const handleVoteStatus = (request: Request, policyId: string) => {
  const resolvedSession = getResolvedSession(db, readSessionCookie(request));
  try {
    const payload = getVoteStatus(db, resolvedSession.session.id, policyId);
    return json(payload, 200, withSessionHeaders({}, resolvedSession.setCookie));
  } catch (error) {
    return errorResponse(error, withSessionHeaders({}, resolvedSession.setCookie));
  }
};

const handleSubmitVote = async (request: Request, policyId: string) => {
  const resolvedSession = getResolvedSession(db, readSessionCookie(request));
  try {
    const body = await parseJson<{ choice?: VoteChoice }>(request);

    if (body.choice !== "approve" && body.choice !== "reject" && body.choice !== "abstain") {
      throw new VotingDatabaseError("invalid_vote_choice", "A valid vote choice is required.");
    }

    const payload = submitVote(db, resolvedSession.session.id, policyId, body.choice);
    return json(payload, 200, withSessionHeaders({}, resolvedSession.setCookie));
  } catch (error) {
    return errorResponse(error, withSessionHeaders({}, resolvedSession.setCookie));
  }
};

const handleVerifyIdentity = async (request: Request) => {
  const sessionId = readSessionCookie(request);
  const body = await parseJson<VerifyIdentityInput>(request);
  const payload = verifyIdentity(db, body, sessionId);
  return json(payload, 200, {
    "Set-Cookie": buildSessionCookie(payload.session.id),
  });
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
        const resolvedSession = getResolvedSession(db, readSessionCookie(request));
        return json(resolvedSession, 200, withSessionHeaders({}, resolvedSession.setCookie));
      }

      const voteMatch = url.pathname.match(/^\/api\/policies\/([^/]+)\/vote$/);
      if (voteMatch && request.method === "GET") {
        return handleVoteStatus(request, decodeURIComponent(voteMatch[1]));
      }

      if (voteMatch && request.method === "POST") {
        return await handleSubmitVote(request, decodeURIComponent(voteMatch[1]));
      }

      if (request.method === "POST" && url.pathname === "/api/auth/verify") {
        return await handleVerifyIdentity(request);
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
