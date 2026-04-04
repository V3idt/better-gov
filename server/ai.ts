import { createHash } from "node:crypto";
import {
  getCachedAiExplanation,
  getPropositionDetailById,
  getResolvedSession,
  storeAiExplanation,
  type VotingDatabase,
  VotingDatabaseError,
} from "./db.ts";
import type {
  AiAudienceRole,
  AiProviderPreference,
  AiProviderUsed,
  PropositionAiExplanation,
  PropositionDetail,
} from "../src/lib/voting.ts";
import { z } from "zod";

const PROMPT_VERSION = "2026-04-04-v1";
const DEFAULT_PROVIDER_ORDER: Exclude<AiProviderPreference, "auto">[] = ["gemini", "openai", "grok"];

const explanationSchema = z.object({
  explanation: z.string().min(1),
  advantages: z.array(z.string().min(1)).min(1).max(5),
  disadvantages: z.array(z.string().min(1)).min(1).max(5),
  impact: z.string().min(1),
});

const explanationJsonSchema = {
  type: "object",
  properties: {
    explanation: {
      type: "string",
    },
    advantages: {
      type: "array",
      items: {
        type: "string",
      },
    },
    disadvantages: {
      type: "array",
      items: {
        type: "string",
      },
    },
    impact: {
      type: "string",
    },
  },
  required: ["explanation", "advantages", "disadvantages", "impact"],
} as const;

type ProviderConfig = {
  provider: Exclude<AiProviderPreference, "auto">;
  model: string;
  apiKey: string;
};

type BuildExplanationInput = {
  db: VotingDatabase;
  sessionId: string | null;
  propositionId: string;
  role: AiAudienceRole;
  providerPreference?: AiProviderPreference;
  fetchImpl?: typeof fetch;
};

function parseProviderOrder(value: string | undefined) {
  const candidates = (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is Exclude<AiProviderPreference, "auto"> => item === "openai" || item === "gemini" || item === "grok");

  return candidates.length ? Array.from(new Set(candidates)) : DEFAULT_PROVIDER_ORDER;
}

const PROVIDER_ORDER = parseProviderOrder(process.env.BETTER_GOV_AI_PROVIDER_ORDER);

const normalizeProviderPreference = (
  providerPreference: AiProviderPreference | undefined,
): AiProviderPreference => providerPreference ?? "auto";

const getProviderCandidates = (providerPreference: AiProviderPreference) => {
  const configuredProviders = new Set(
    (["openai", "gemini", "grok"] as const).filter((provider) => getProviderConfig(provider) !== null),
  );

  if (providerPreference === "auto") {
    return PROVIDER_ORDER.filter((provider) => configuredProviders.has(provider));
  }

  return [
    ...[providerPreference, ...PROVIDER_ORDER.filter((provider) => provider !== providerPreference)].filter(
      (provider) => configuredProviders.has(provider),
    ),
  ];
};

const getProviderConfig = (provider: Exclude<AiProviderPreference, "auto">): ProviderConfig | null => {
  if (provider === "openai") {
    const apiKey = process.env.BETTER_GOV_OPENAI_API_KEY?.trim() ?? "";
    const model = process.env.BETTER_GOV_OPENAI_MODEL?.trim() ?? "gpt-4o-mini";
    return apiKey ? { provider, model, apiKey } : null;
  }

  if (provider === "gemini") {
    const apiKey = process.env.BETTER_GOV_GEMINI_API_KEY?.trim() ?? "";
    const model = process.env.BETTER_GOV_GEMINI_MODEL?.trim() ?? "gemini-2.5-flash";
    return apiKey ? { provider, model, apiKey } : null;
  }

  const apiKey = process.env.BETTER_GOV_GROK_API_KEY?.trim() ?? "";
  const model = process.env.BETTER_GOV_GROK_MODEL?.trim() ?? "grok-2-latest";
  return apiKey ? { provider, model, apiKey } : null;
};

const hashPropositionContext = (detail: PropositionDetail) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        id: detail.id,
        slug: detail.slug,
        jurisdictionSlug: detail.jurisdictionSlug,
        path: detail.path,
        jurisdiction: detail.jurisdiction,
        category: detail.category,
        title: detail.title,
        status: detail.status,
        closesAt: detail.closesAt,
        postedAt: detail.postedAt,
        sponsor: detail.sponsor,
        supportPercent: detail.supportPercent,
        turnoutCount: detail.turnoutCount,
        scope: detail.scope,
        tldr: detail.tldr,
        bullets: detail.bullets,
        reviewChecks: detail.reviewChecks,
        brief: detail.brief,
      }),
    )
    .digest("hex");

const sourcesUsedForDetail = (detail: PropositionDetail) => [
  `Title: ${detail.title}`,
  `TL;DR: ${detail.tldr}`,
  `Bullet points (${detail.bullets.length})`,
  `Review checks (${detail.reviewChecks.length})`,
  "Full brief text",
];

const buildPrompt = (detail: PropositionDetail, role: AiAudienceRole) => {
  const roleLabel = role === "student" ? "student" : "staff member";

  return [
    "You are helping a university voter understand one policy.",
    "Use only the policy information provided below.",
    "Stay balanced and factual.",
    "Do not tell the user how to vote.",
    "Write in plain language for a confused non-expert.",
    `Explain the likely impact for a ${roleLabel}.`,
    "Return valid JSON only with these keys: explanation, advantages, disadvantages, impact.",
    "advantages and disadvantages must be arrays of short strings.",
    "Keep the response concise but useful.",
    "",
    `Policy title: ${detail.title}`,
    `Policy path: ${detail.path}`,
    `Jurisdiction: ${detail.jurisdiction}`,
    `Category: ${detail.category}`,
    `Scope: ${detail.scope}`,
    `TL;DR: ${detail.tldr}`,
    `Quick read: ${detail.reviewChecks.map((check) => `${check.name}=${check.status}`).join(", ")}`,
    `Bullet points: ${detail.bullets.map((bullet) => `- ${bullet}`).join("\n")}`,
    "",
    "Full brief:",
    detail.brief,
  ].join("\n");
};

const extractJsonText = (raw: string) => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
};

const escapeControlCharsInJsonStrings = (raw: string) => {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (inString) {
      if (escaped) {
        result += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        result += char;
        escaped = true;
        continue;
      }

      if (char === "\"") {
        result += char;
        inString = false;
        continue;
      }

      if (char === "\n") {
        result += "\\n";
        continue;
      }

      if (char === "\r") {
        result += "\\r";
        continue;
      }

      if (char === "\t") {
        result += "\\t";
        continue;
      }
    } else if (char === "\"") {
      inString = true;
    }

    result += char;
  }

  return result;
};

const parseExplanationPayload = (raw: string) => {
  const jsonText = extractJsonText(raw);
  try {
    return explanationSchema.parse(JSON.parse(jsonText) as unknown);
  } catch {
    const repaired = escapeControlCharsInJsonStrings(jsonText);
    return explanationSchema.parse(JSON.parse(repaired) as unknown);
  }
};

const openAiExplanation = async (
  config: ProviderConfig,
  prompt: string,
  fetchImpl: typeof fetch,
) => {
  const response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Return only valid JSON with keys explanation, advantages, disadvantages, impact. Do not include markdown fences.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw new Error("OpenAI returned an empty explanation.");
  }

  return parseExplanationPayload(content);
};

const geminiExplanation = async (
  config: ProviderConfig,
  prompt: string,
  fetchImpl: typeof fetch,
) => {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
  );
  url.searchParams.set("key", config.apiKey);

  const response = await fetchImpl(
    url.toString(),
    {
      method: "POST",
      headers: {
        "x-goog-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `Return only valid JSON with keys explanation, advantages, disadvantages, impact.\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
          responseJsonSchema: explanationJsonSchema,
        },
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Gemini request failed with status ${response.status}${message ? `: ${message}` : "."}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string | null }>;
      };
    }>;
  };
  const content =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!content) {
    throw new Error("Gemini returned an empty explanation.");
  }

  return parseExplanationPayload(content);
};

const grokExplanation = async (
  config: ProviderConfig,
  prompt: string,
  fetchImpl: typeof fetch,
) => {
  const response = await fetchImpl("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Return only valid JSON with keys explanation, advantages, disadvantages, impact. Do not include markdown fences.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw new Error("Grok returned an empty explanation.");
  }

  return parseExplanationPayload(content);
};

const providerExplanation = async (
  provider: Exclude<AiProviderPreference, "auto">,
  prompt: string,
  fetchImpl: typeof fetch,
) => {
  const config = getProviderConfig(provider);
  if (!config) {
    throw new Error(`${provider} is not configured.`);
  }

  if (provider === "openai") {
    return openAiExplanation(config, prompt, fetchImpl);
  }

  if (provider === "gemini") {
    return geminiExplanation(config, prompt, fetchImpl);
  }

  return grokExplanation(config, prompt, fetchImpl);
};

const buildResponse = (
  explanation: Omit<PropositionAiExplanation, "cached" | "generatedAt">,
  providerUsed: AiProviderUsed,
  cached: boolean,
): PropositionAiExplanation => ({
  ...explanation,
  providerUsed,
  cached,
  generatedAt: new Date().toISOString(),
});

export const getPolicyExplanation = async ({
  db,
  sessionId,
  propositionId,
  role,
  providerPreference,
  fetchImpl = fetch,
}: BuildExplanationInput): Promise<PropositionAiExplanation> => {
  const session = getResolvedSession(db, sessionId);
  if (!session) {
    throw new VotingDatabaseError("authentication_required", "Sign in with a university account to use the AI explainer.");
  }

  const detail = getPropositionDetailById(db, sessionId, propositionId).proposition;
  const requestedProvider = normalizeProviderPreference(providerPreference);
  const contentHash = hashPropositionContext(detail);
  const cached = getCachedAiExplanation(db, propositionId, role, requestedProvider, contentHash, PROMPT_VERSION);
  if (cached) {
    return {
      ...cached,
      cached: true,
    };
  }

  const prompt = buildPrompt(detail, role);
  const providers = getProviderCandidates(requestedProvider);

  for (const provider of providers) {
    try {
      const parsed = await providerExplanation(provider, prompt, fetchImpl);
      const payload = buildResponse(
        {
          propositionId: detail.id,
          role,
          requestedProvider,
          explanation: parsed.explanation,
          advantages: parsed.advantages,
          disadvantages: parsed.disadvantages,
          impact: parsed.impact,
          sourcesUsed: sourcesUsedForDetail(detail),
        },
        provider,
        false,
      );
      storeAiExplanation(db, payload, contentHash, PROMPT_VERSION);
      return payload;
    } catch (error) {
      console.error(`[ai] ${provider} explanation failed`, error);
    }
  }

  throw new VotingDatabaseError(
    "delivery_failed",
    "Unable to reach an AI provider. Please ensure at least one provider key is configured.",
  );
};
