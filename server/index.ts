import {
  buildClearSessionCookie,
  buildSessionCookie,
  createProposition,
  getPropositionDetail,
  getSession,
  listPropositionHistory,
  listPropositions,
  openVotingDatabase,
  requestSignInCode,
  SESSION_COOKIE_NAME,
  signOut,
  submitVote,
  verifySignInCode,
  VotingDatabaseError,
} from "./db.ts";
import { getPolicyChatAnswer, getPolicyExplanation } from "./ai.ts";
import type {
  PropositionAiChatRequest,
  PropositionAiExplanationRequest,
  CreatePropositionInput,
  RequestSignInCodeInput,
  VerifySignInCodeInput,
  VoteChoice,
} from "../src/lib/voting.ts";

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

  return request.headers.get("x-real-ip");
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

      if (request.method === "GET" && url.pathname === "/api/propositions") {
        return json(listPropositions(db));
      }

      if (request.method === "POST" && url.pathname === "/api/propositions") {
        const body = await parseJson<CreatePropositionInput>(request);

        if (
          typeof body.title !== "string" ||
          typeof body.category !== "string" ||
          typeof body.scope !== "string" ||
          typeof body.tldr !== "string" ||
          typeof body.brief !== "string" ||
          typeof body.closesAt !== "string" ||
          !Array.isArray(body.bullets) ||
          body.bullets.some((bullet) => typeof bullet !== "string")
        ) {
          throw new VotingDatabaseError("invalid_request", "Enter valid proposition details.");
        }

        return json(createProposition(db, readSessionCookie(request), body, readClientAddress(request)));
      }

      if (request.method === "GET" && url.pathname === "/api/propositions/history") {
        return json(listPropositionHistory(db));
      }

      if (request.method === "GET" && url.pathname === "/api/propositions/by-path") {
        const propositionPath = url.searchParams.get("path");
        if (!propositionPath) {
          throw new VotingDatabaseError("invalid_request", "A proposition path is required.");
        }

        return json(getPropositionDetail(db, readSessionCookie(request), propositionPath));
      }

      const propositionExplainMatch = url.pathname.match(/^\/api\/propositions\/([^/]+)\/explanation$/);
      if (propositionExplainMatch && request.method === "POST") {
        const body = await parseJson<PropositionAiExplanationRequest>(request);
        if (body.role !== "student" && body.role !== "staff") {
          throw new VotingDatabaseError("invalid_request", "Choose a valid audience role.");
        }

        if (
          body.provider !== undefined &&
          body.provider !== "auto" &&
          body.provider !== "openai" &&
          body.provider !== "gemini" &&
          body.provider !== "grok"
        ) {
          throw new VotingDatabaseError("invalid_request", "Choose a valid AI provider.");
        }

        return json(
          await getPolicyExplanation({
            db,
            sessionId: readSessionCookie(request),
            propositionId: decodeURIComponent(propositionExplainMatch[1]),
            role: body.role,
            providerPreference: body.provider,
          }),
        );
      }

      const propositionChatMatch = url.pathname.match(/^\/api\/propositions\/([^/]+)\/chat$/);
      if (propositionChatMatch && request.method === "POST") {
        const body = await parseJson<PropositionAiChatRequest>(request);
        if (body.role !== "student" && body.role !== "staff") {
          throw new VotingDatabaseError("invalid_request", "Choose a valid audience role.");
        }

        if (typeof body.question !== "string" || !body.question.trim()) {
          throw new VotingDatabaseError("invalid_request", "Ask a question to continue.");
        }

        if (
          body.provider !== undefined &&
          body.provider !== "auto" &&
          body.provider !== "openai" &&
          body.provider !== "gemini" &&
          body.provider !== "grok"
        ) {
          throw new VotingDatabaseError("invalid_request", "Choose a valid AI provider.");
        }

        return json(
          await getPolicyChatAnswer({
            db,
            sessionId: readSessionCookie(request),
            propositionId: decodeURIComponent(propositionChatMatch[1]),
            role: body.role,
            providerPreference: body.provider,
            question: body.question,
          }),
        );
      }

      const propositionVoteMatch = url.pathname.match(/^\/api\/propositions\/([^/]+)\/vote$/);
      if (propositionVoteMatch && request.method === "POST") {
        const body = await parseJson<{ choice?: VoteChoice }>(request);
        if (body.choice !== "approve" && body.choice !== "reject" && body.choice !== "abstain") {
          throw new VotingDatabaseError("invalid_vote_choice", "A valid vote choice is required.");
        }

        return json(submitVote(db, readSessionCookie(request), decodeURIComponent(propositionVoteMatch[1]), body.choice));
      }

      if (request.method === "POST" && url.pathname === "/api/auth/request-code") {
        const body = await parseJson<RequestSignInCodeInput>(request);
        if (typeof body.email !== "string") {
          throw new VotingDatabaseError("invalid_email", "Enter your university email.");
        }

        return json(await requestSignInCode(db, body.email));
      }

      if (request.method === "POST" && url.pathname === "/api/auth/verify-code") {
        const body = await parseJson<VerifySignInCodeInput>(request);
        if (typeof body.email !== "string") {
          throw new VotingDatabaseError("invalid_email", "Enter your university email.");
        }

        if (typeof body.code !== "string") {
          throw new VotingDatabaseError("invalid_code", "Enter the 6-digit code.");
        }

        const payload = verifySignInCode(db, body.email, body.code);
        return json(payload, 200, {
          "Set-Cookie": buildSessionCookie(payload.session.id),
        });
      }

      if (request.method === "POST" && url.pathname === "/api/auth/sign-out") {
        return json(signOut(db, readSessionCookie(request)), 200, {
          "Set-Cookie": buildClearSessionCookie(),
        });
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
