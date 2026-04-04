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
import { getPolicyChatAnswer, getPolicyDraft, getPolicyExplanation } from "./ai.ts";

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

  it("reuses the cached chat answer for the same policy, role, provider, and question", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("hana.tadesse"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("hana.tadesse"), codeDelivery.devCode ?? "");

    process.env.BETTER_GOV_GEMINI_API_KEY = "gemini-test-key";

    let fetchCount = 0;
    const fetchImpl = async () => {
      fetchCount += 1;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      answer: "Gemini chat answer",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const first = await getPolicyChatAnswer({
      db,
      sessionId: verified.session.id,
      propositionId: "campus:transparent-department-budgets",
      role: "staff",
      providerPreference: "gemini",
      question: "What happens to student services?",
      fetchImpl,
    });

    const second = await getPolicyChatAnswer({
      db,
      sessionId: verified.session.id,
      propositionId: "campus:transparent-department-budgets",
      role: "staff",
      providerPreference: "gemini",
      question: "What happens to student services?",
      fetchImpl,
    });

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.providerUsed).toBe("gemini");
    expect(second.answer).toBe("Gemini chat answer");
    expect(fetchCount).toBe(1);
  });

  it("fails when no provider is configured", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("hana.tadesse"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("hana.tadesse"), codeDelivery.devCode ?? "");

    await expect(
      getPolicyExplanation({
        db,
        sessionId: verified.session.id,
        propositionId: "campus:transparent-department-budgets",
        role: "staff",
        providerPreference: "auto",
      }),
    ).rejects.toThrow(VotingDatabaseError);
  });

  it("fails chat requests when no provider is configured", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("rahel.bekele"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("rahel.bekele"), codeDelivery.devCode ?? "");

    await expect(
      getPolicyChatAnswer({
        db,
        sessionId: verified.session.id,
        propositionId: "campus:transparent-department-budgets",
        role: "student",
        providerPreference: "auto",
        question: "What does this mean?",
      }),
    ).rejects.toThrow(VotingDatabaseError);
  });

  it("surfaces quota errors as rate limited responses", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("rahel.bekele"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("rahel.bekele"), codeDelivery.devCode ?? "");

    process.env.BETTER_GOV_GEMINI_API_KEY = "gemini-test-key";

    await expect(
      getPolicyExplanation({
        db,
        sessionId: verified.session.id,
        propositionId: "campus:transparent-department-budgets",
        role: "student",
        providerPreference: "gemini",
        fetchImpl: async () =>
          new Response("quota exceeded", {
            status: 429,
            headers: { "content-type": "text/plain" },
          }),
      }),
    ).rejects.toThrow("Gemini quota or rate limit reached");
  });

  it("auto-creates a draft proposition from a supported policy and caches the result", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("rahel.bekele"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("rahel.bekele"), codeDelivery.devCode ?? "");

    process.env.BETTER_GOV_GEMINI_API_KEY = "gemini-test-key";

    let fetchCount = 0;
    const fetchImpl = async () => {
      fetchCount += 1;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: "Residence Hall Quiet Hours Upgrade",
                      category: "Campus housing",
                      scope: "Residence halls and shared study spaces",
                      tldr: "Create quieter evening study hours and clearer guest expectations in residence halls.",
                      bullets: [
                        "Sets a consistent quiet-hours window for all residence halls.",
                        "Adds a simple guest guidance rule for evenings.",
                        "Creates an appeal path for exceptional circumstances.",
                      ],
                      brief: "# Residence Hall Quiet Hours Upgrade\n\n## Purpose\n\nStrengthen the living and studying environment for residents who backed the original housing policy.\n\n## Changes\n\n- Standardize quiet hours.\n- Publish guest expectations.\n- Add a light appeal process.\n\n## Tradeoff\n\nResidents get more predictability, while housing staff need a clear enforcement workflow.",
                      rationale: "It extends the housing policy in a way that improves everyday life for the same people who supported stronger housing standards.",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const first = await getPolicyDraft({
      db,
      sessionId: verified.session.id,
      propositionId: "academic-senate:mandatory-attendance-policy",
      providerPreference: "gemini",
      fetchImpl,
    });

    const second = await getPolicyDraft({
      db,
      sessionId: verified.session.id,
      propositionId: "academic-senate:mandatory-attendance-policy",
      providerPreference: "gemini",
      fetchImpl,
    });

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(first.providerUsed).toBe("gemini");
    expect(first.proposition.status).toBe("open");
    expect(first.proposition.aiGenerated).toBe(true);
    expect(first.proposition.aiOrigin?.sourcePropositionId).toBe("academic-senate:mandatory-attendance-policy");
    expect(first.proposition.brief).toContain("Why this policy was created");
    expect(first.proposition.title).toBe("Residence Hall Quiet Hours Upgrade");
    expect(second.proposition.id).toBe(first.proposition.id);
    expect(fetchCount).toBe(1);
  });

  it("sends the Gemini API key in the request and defaults to gemini-2.5-flash", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("rahel.bekele"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("rahel.bekele"), codeDelivery.devCode ?? "");

    process.env.BETTER_GOV_GEMINI_API_KEY = "gemini-test-key";
    delete process.env.BETTER_GOV_GEMINI_MODEL;

    let seenUrl = "";
    let seenApiKey = "";
    const result = await getPolicyExplanation({
      db,
      sessionId: verified.session.id,
      propositionId: "campus:transparent-department-budgets",
      role: "student",
      providerPreference: "gemini",
      fetchImpl: async (input) => {
        seenUrl = typeof input === "string" ? input : input.toString();
        const parsed = new URL(seenUrl);
        seenApiKey = parsed.searchParams.get("key") ?? "";

        expect(seenUrl).toContain("generativelanguage.googleapis.com");
        expect(seenUrl).toContain("gemini-2.5-flash");
        expect(seenApiKey).toBe("gemini-test-key");

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
    expect(result.explanation).toBe("Gemini explanation");
  });

  it("repairs malformed newlines in Gemini JSON output", async () => {
    const codeDelivery = await requestSignInCode(db, emailAtConfiguredDomain("rahel.bekele"));
    const verified = verifySignInCode(db, emailAtConfiguredDomain("rahel.bekele"), codeDelivery.devCode ?? "");

    process.env.BETTER_GOV_GEMINI_API_KEY = "gemini-test-key";

    const result = await getPolicyExplanation({
      db,
      sessionId: verified.session.id,
      propositionId: "campus:transparent-department-budgets",
      role: "student",
      providerPreference: "gemini",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text:
                        '{\n  "explanation": "Line one\nLine two",\n  "advantages": ["a"],\n  "disadvantages": ["b"],\n  "impact": "c"\n}',
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });

    expect(result.providerUsed).toBe("gemini");
    expect(result.explanation).toContain("Line one");
    expect(result.explanation).toContain("Line two");
  });
});
