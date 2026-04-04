import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  openVotingDatabase,
  requestSignInCode,
  verifySignInCode,
  VotingDatabaseError,
} from "./db.ts";
import { getPolicyExplanation } from "./ai.ts";

let dbPath = "";
let db: ReturnType<typeof openVotingDatabase>;
const configuredDomain = process.env.BETTER_GOV_ALLOWED_EMAIL_DOMAIN ?? "university.edu";
const emailAtConfiguredDomain = (localPart: string) => `${localPart}@${configuredDomain}`;
const envKeys = [
  "BETTER_GOV_OPENAI_API_KEY",
  "BETTER_GOV_OPENAI_MODEL",
  "BETTER_GOV_GEMINI_API_KEY",
  "BETTER_GOV_GEMINI_MODEL",
  "BETTER_GOV_GROK_API_KEY",
  "BETTER_GOV_GROK_MODEL",
];
const savedEnv = new Map<string, string | undefined>();

beforeEach(() => {
  const tempDir = mkdtempSync(join(tmpdir(), "better-gov-ai-"));
  dbPath = join(tempDir, "better-gov.sqlite");
  db = openVotingDatabase(dbPath);

  for (const key of envKeys) {
    savedEnv.set(key, process.env[key]);
  }
});

afterEach(() => {
  db.close();
  if (dbPath) {
    rmSync(dirname(dbPath), { recursive: true, force: true });
  }

  for (const key of envKeys) {
    const value = savedEnv.get(key);
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("policy AI explainer", () => {
  it("requires an authenticated session", async () => {
    await expect(
      getPolicyExplanation({
        db,
        sessionId: null,
        propositionId: "campus:transparent-department-budgets",
        role: "student",
      }),
    ).rejects.toThrow(VotingDatabaseError);
  });

  it("falls back to the next configured provider when the selected one fails", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("rahel.bekele"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("rahel.bekele"), codeDelivery.devCode ?? "");

    process.env.BETTER_GOV_OPENAI_API_KEY = "openai-test-key";
    process.env.BETTER_GOV_GEMINI_API_KEY = "gemini-test-key";

    const fetchCalls: string[] = [];
    const result = await getPolicyExplanation({
      db,
      sessionId: verified.session.id,
      propositionId: "campus:transparent-department-budgets",
      role: "student",
      providerPreference: "openai",
      fetchImpl: async (input, init) => {
        const url = typeof input === "string" ? input : input.toString();
        fetchCalls.push(url);

        if (url.includes("api.openai.com")) {
          return new Response("fail", { status: 500 });
        }

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        explanation: "Gemini explanation",
                        advantages: ["clear"],
                        disadvantages: ["limited"],
                        impact: "students benefit",
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    expect(result.providerUsed).toBe("gemini");
    expect(result.cached).toBe(false);
    expect(result.explanation).toBe("Gemini explanation");
    expect(fetchCalls.some((url) => url.includes("api.openai.com"))).toBe(true);
    expect(fetchCalls.some((url) => url.includes("generativelanguage.googleapis.com"))).toBe(true);
  });

  it("reuses the cached explanation for the same policy, role, and provider preference", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("leila.mekonnen"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("leila.mekonnen"), codeDelivery.devCode ?? "");

    process.env.BETTER_GOV_OPENAI_API_KEY = "openai-test-key";

    let fetchCount = 0;
    const fetchImpl = async () => {
      fetchCount += 1;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  explanation: "OpenAI explanation",
                  advantages: ["fast"],
                  disadvantages: ["cost"],
                  impact: "students see a change",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const first = await getPolicyExplanation({
      db,
      sessionId: verified.session.id,
      propositionId: "campus:transparent-department-budgets",
      role: "student",
      providerPreference: "openai",
      fetchImpl,
    });

    const second = await getPolicyExplanation({
      db,
      sessionId: verified.session.id,
      propositionId: "campus:transparent-department-budgets",
      role: "student",
      providerPreference: "openai",
      fetchImpl,
    });

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.providerUsed).toBe("openai");
    expect(fetchCount).toBe(1);
  });

  it("returns a deterministic fallback when no provider is configured", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("hana.tadesse"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("hana.tadesse"), codeDelivery.devCode ?? "");

    const result = await getPolicyExplanation({
      db,
      sessionId: verified.session.id,
      propositionId: "campus:transparent-department-budgets",
      role: "staff",
      providerPreference: "auto",
    });

    expect(result.providerUsed).toBe("fallback");
    expect(result.cached).toBe(false);
    expect(result.explanation.length).toBeGreaterThan(0);
  });
});
