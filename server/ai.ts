import { createHash } from "node:crypto";
import {
  AI_SYSTEM_SESSION_ID,
  getCachedAiExplanation,
  getCachedAiChatAnswer,
  getCachedAiPolicyDraft,
  getAutomaticAiPolicyBuilderStatus,
  getPropositionDetailById,
  listPropositionHistory,
  getResolvedSession,
  markPropositionAiGenerated,
  storeAiPolicyDraft,
  storeAiExplanation,
  storeAiChatAnswer,
  createProposition,
  type VotingDatabase,
  VotingDatabaseError,
} from "./db.ts";
import type {
  AiAudienceRole,
  AiProviderPreference,
  AiProviderUsed,
  PropositionAiChatResponse,
  PropositionAiDraftResponse,
  PropositionAiExplanation,
  PropositionDetail,
  selectAiDraftSourcePropositions,
} from "../src/lib/voting.ts";
import { z } from "zod";

const PROMPT_VERSION = "2026-04-04-v1";
const DRAFT_PROMPT_VERSION = "2026-04-04-draft-v2";
const DEFAULT_PROVIDER_ORDER: Exclude<AiProviderPreference, "auto">[] = ["gemini", "openai", "grok"];
const DRAFT_CLOSE_OFFSET_MS = 60 * 24 * 60 * 60 * 1000;

const explanationSchema = z.object({
  explanation: z.string().min(1),
  advantages: z.array(z.string().min(1)).min(1).max(5),
  disadvantages: z.array(z.string().min(1)).min(1).max(5),
  impact: z.string().min(1),
});

const chatAnswerSchema = z.object({
  answer: z.string().min(1),
});

const draftSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  scope: z.string().min(1),
  tldr: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(2).max(6),
  rationale: z.string().min(1),
});

type DraftPayload = z.infer<typeof draftSchema>;
const draftModelSchema = z.object({
  title: z.string().optional(),
  category: z.string().optional(),
  scope: z.string().optional(),
  tldr: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  rationale: z.string().optional(),
});

type DraftModelPayload = z.infer<typeof draftModelSchema>;
let automaticAiPublishInFlight: Promise<ReturnType<typeof getAutomaticAiPolicyBuilderStatus>> | null = null;

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

const chatAnswerJsonSchema = {
  type: "object",
  properties: {
    answer: {
      type: "string",
    },
  },
  required: ["answer"],
} as const;

const draftJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    category: { type: "string" },
    scope: { type: "string" },
    tldr: { type: "string" },
    bullets: {
      type: "array",
      items: { type: "string" },
    },
    rationale: { type: "string" },
  },
  required: ["title", "category", "scope", "tldr", "bullets", "rationale"],
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

type BuildChatInput = BuildExplanationInput & {
  question: string;
};

const providerLabel = (provider: Exclude<AiProviderPreference, "auto">) => {
  if (provider === "openai") return "OpenAI";
  if (provider === "gemini") return "Gemini";
  return "Grok";
};

const providerRequestError = (
  provider: Exclude<AiProviderPreference, "auto">,
  status: number,
  kind: "explanation" | "chat" | "draft",
  message?: string,
) => {
  const label = providerLabel(provider);

  if (status === 429) {
    return new VotingDatabaseError(
      "rate_limited",
      `${label} quota or rate limit reached. Please try again later.`,
    );
  }

  const suffix = message ? `: ${message}` : ".";
  return new Error(`${label} ${kind} request failed with status ${status}${suffix}`);
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

const hashPropositionSetContext = (details: PropositionDetail[]) =>
  createHash("sha256")
    .update(
      JSON.stringify(
        details.map((detail) => ({
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
        })),
      ),
    )
    .digest("hex");

const hashChatQuestion = (question: string) =>
  createHash("sha256")
    .update(question.trim().toLowerCase().replace(/\s+/g, " "))
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

const buildChatPrompt = (detail: PropositionDetail, role: AiAudienceRole, question: string) => {
  const roleLabel = role === "student" ? "student" : "staff member";

  return [
    "You are helping a university voter understand one policy.",
    "Use only the policy information provided below.",
    "Stay balanced and factual.",
    "Do not tell the user how to vote.",
    "Write in plain language for a confused non-expert.",
    `Answer the user as a ${roleLabel}.`,
    "Return valid JSON only with this key: answer.",
    "Keep the answer concise but useful.",
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
    "",
    `User question: ${question.trim()}`,
  ].join("\n");
};

const formatSourcePolicyBlock = (detail: PropositionDetail, index: number) =>
  [
    `${index + 1}. ${detail.title}`,
    `   Path: ${detail.path}`,
    `   Support: ${detail.supportPercent === null ? "unknown" : `${detail.supportPercent.toFixed(1)}%`} from ${detail.turnoutCount.toLocaleString()} votes`,
    `   Category: ${detail.category}`,
    `   Scope: ${detail.scope}`,
    `   TL;DR: ${detail.tldr}`,
    `   Quick read: ${detail.reviewChecks.map((check) => `${check.name}=${check.status}`).join(", ")}`,
    `   Bullets: ${detail.bullets.map((bullet) => `- ${bullet}`).join(" | ")}`,
  ].join("\n");

const buildDraftPrompt = (details: PropositionDetail[]) =>
  [
    "You are helping a university governance team design a follow-up open policy.",
    "Create one new policy that strengthens, extends, or complements the shared direction across the source policies.",
    "Assume the draft should appeal to the people who supported these policies and benefit them directly.",
    "Use only the policy information provided below.",
    "Stay balanced and factual.",
    "Do not copy the source policy wording.",
    "Write in plain language for a university audience.",
    "Return valid JSON only with keys title, category, scope, tldr, bullets, rationale.",
    "bullets must be short practical points.",
    "Keep the draft specific enough that it could be posted immediately.",
    "",
    `Source policies (${details.length}):`,
    ...details.map((detail, index) => formatSourcePolicyBlock(detail, index)),
  ].join("\n");

const buildAiPolicyBrief = (draft: DraftPayload, details: PropositionDetail[]) =>
  [
    `# ${draft.title}`,
    "",
    "## Purpose",
    draft.tldr.trim(),
    "",
    "## Why this policy was created",
    draft.rationale.trim(),
    "",
    "## Key changes",
    draft.bullets.map((bullet) => `- ${bullet.trim()}`).join("\n"),
    "",
    "## Source policies",
    ...details.map((detail, index) => `${index + 1}. ${detail.title} (${detail.path})`),
    "",
    "## Tradeoff",
    `This policy was generated to build on support for the selected closed policies while keeping the benefits focused on the people who backed them.`,
  ].join("\n");

const normalizeDraftField = (value: string, fallback: string, maxLength: number) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    return fallback.trim().slice(0, maxLength);
  }

  return trimmed;
};

const normalizeDraftPayload = (parsed: DraftModelPayload, sourceDetails: PropositionDetail[], primarySource: PropositionDetail): DraftPayload => {
  const sourceBullets = Array.from(
    new Set(sourceDetails.flatMap((detail) => detail.bullets).map((bullet) => bullet.trim()).filter(Boolean)),
  );
  const fallbackBullets =
    sourceBullets.length >= 2
      ? sourceBullets.slice(0, 6)
      : ["Build on the selected closed policies.", "Keep the benefits focused on the people who backed them."];

  const bullets = Array.from(
    new Set(
      (parsed.bullets?.length ? parsed.bullets : fallbackBullets)
        .map((bullet) => bullet.trim())
        .filter(Boolean),
    ),
  ).slice(0, 6);

  const normalizedBullets = bullets.length >= 2 ? bullets : fallbackBullets;

  return {
    title: normalizeDraftField(parsed.title ?? "", primarySource.title, 120),
    category: normalizeDraftField(parsed.category ?? "", primarySource.category, 48),
    scope: normalizeDraftField(parsed.scope ?? "", primarySource.scope, 80),
    tldr: normalizeDraftField(parsed.tldr ?? "", primarySource.tldr, 280),
    bullets: normalizedBullets,
    rationale: normalizeDraftField(
      parsed.rationale ?? "",
      `It extends the shared direction of the selected policies and keeps the benefits focused on the people who backed them.`,
      800,
    ),
  };
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

const balancePossiblyTruncatedJson = (raw: string) => {
  let result = "";
  let inString = false;
  let escaped = false;
  const stack: Array<"{" | "[" > = [];

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

      result += char;
      continue;
    }

    if (char === "\"") {
      inString = true;
      result += char;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      result += char;
      continue;
    }

    if (char === "}" || char === "]") {
      const expected = char === "}" ? "{" : "[";
      const matchIndex = stack.lastIndexOf(expected);
      if (matchIndex >= 0) {
        stack.splice(matchIndex, 1);
      }

      result += char;
      continue;
    }

    result += char;
  }

  if (inString) {
    result += "\"";
  }

  for (let index = stack.length - 1; index >= 0; index -= 1) {
    result += stack[index] === "{" ? "}" : "]";
  }

  return result;
};

const parseJsonPayload = <T>(raw: string, schema: z.ZodType<T>) => {
  const jsonText = extractJsonText(raw);
  const candidates = [
    jsonText,
    escapeControlCharsInJsonStrings(jsonText),
    balancePossiblyTruncatedJson(jsonText),
    balancePossiblyTruncatedJson(escapeControlCharsInJsonStrings(jsonText)),
  ];

  for (const candidate of candidates) {
    try {
      return schema.parse(JSON.parse(candidate) as unknown);
    } catch {
      continue;
    }
  }

  return schema.parse(JSON.parse(candidates[candidates.length - 1]) as unknown);
};

const parseExplanationPayload = (raw: string) => parseJsonPayload(raw, explanationSchema);

const parseChatPayload = (raw: string) => parseJsonPayload(raw, chatAnswerSchema);

const parseDraftPayload = (raw: string) => parseJsonPayload(raw, draftModelSchema);

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
    throw providerRequestError("openai", response.status, "explanation");
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
    throw providerRequestError("gemini", response.status, "explanation", message);
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
    throw providerRequestError("grok", response.status, "explanation");
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

const openAiChat = async (
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
            "Return only valid JSON with key answer. Do not include markdown fences.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw providerRequestError("openai", response.status, "chat");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw new Error("OpenAI returned an empty answer.");
  }

  return parseChatPayload(content);
};

const geminiChat = async (
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
            parts: [{ text: `Return only valid JSON with key answer.\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 768,
          responseMimeType: "application/json",
          responseJsonSchema: chatAnswerJsonSchema,
        },
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw providerRequestError("gemini", response.status, "chat", message);
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
    throw new Error("Gemini returned an empty answer.");
  }

  return parseChatPayload(content);
};

const grokChat = async (
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
            "Return only valid JSON with key answer. Do not include markdown fences.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw providerRequestError("grok", response.status, "chat");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw new Error("Grok returned an empty answer.");
  }

  return parseChatPayload(content);
};

const openAiDraft = async (
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
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content:
            "Return only valid JSON with keys title, category, scope, tldr, bullets, rationale. Do not include markdown fences.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw providerRequestError("openai", response.status, "draft");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw new Error("OpenAI returned an empty draft.");
  }

  return parseDraftPayload(content);
};

const geminiDraft = async (
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
            parts: [{ text: `Return only valid JSON with keys title, category, scope, tldr, bullets, rationale.\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 1536,
          responseMimeType: "application/json",
          responseJsonSchema: draftJsonSchema,
        },
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw providerRequestError("gemini", response.status, "draft", message);
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
    throw new Error("Gemini returned an empty draft.");
  }

  return parseDraftPayload(content);
};

const grokDraft = async (
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
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content:
            "Return only valid JSON with keys title, category, scope, tldr, bullets, rationale. Do not include markdown fences.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw providerRequestError("grok", response.status, "draft");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw new Error("Grok returned an empty draft.");
  }

  return parseDraftPayload(content);
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

const providerChat = async (
  provider: Exclude<AiProviderPreference, "auto">,
  prompt: string,
  fetchImpl: typeof fetch,
) => {
  const config = getProviderConfig(provider);
  if (!config) {
    throw new Error(`${provider} is not configured.`);
  }

  if (provider === "openai") {
    return openAiChat(config, prompt, fetchImpl);
  }

  if (provider === "gemini") {
    return geminiChat(config, prompt, fetchImpl);
  }

  return grokChat(config, prompt, fetchImpl);
};

const providerDraft = async (
  provider: Exclude<AiProviderPreference, "auto">,
  prompt: string,
  fetchImpl: typeof fetch,
) => {
  const config = getProviderConfig(provider);
  if (!config) {
    throw new Error(`${provider} is not configured.`);
  }

  if (provider === "openai") {
    return openAiDraft(config, prompt, fetchImpl);
  }

  if (provider === "gemini") {
    return geminiDraft(config, prompt, fetchImpl);
  }

  return grokDraft(config, prompt, fetchImpl);
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

const buildChatResponse = (
  answer: Omit<PropositionAiChatResponse, "cached" | "generatedAt">,
  providerUsed: AiProviderUsed,
  cached: boolean,
): PropositionAiChatResponse => ({
  ...answer,
  providerUsed,
  cached,
  generatedAt: new Date().toISOString(),
});

const buildDraftResponse = (
  draft: Omit<PropositionAiDraftResponse, "cached" | "generatedAt">,
  providerUsed: AiProviderUsed,
  cached: boolean,
): PropositionAiDraftResponse => ({
  ...draft,
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
  let rateLimitedError: VotingDatabaseError | null = null;

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
      if (error instanceof VotingDatabaseError && error.code === "rate_limited") {
        rateLimitedError = error;
      }
      console.error(`[ai] ${provider} explanation failed`, error);
    }
  }

  if (rateLimitedError) {
    throw rateLimitedError;
  }

  throw new VotingDatabaseError(
    "delivery_failed",
    "Unable to reach an AI provider. Please ensure at least one provider key is configured.",
  );
};

export const getPolicyChatAnswer = async ({
  db,
  sessionId,
  propositionId,
  role,
  providerPreference,
  question,
  fetchImpl = fetch,
}: BuildChatInput): Promise<PropositionAiChatResponse> => {
  const session = getResolvedSession(db, sessionId);
  if (!session) {
    throw new VotingDatabaseError("authentication_required", "Sign in with a university account to use the AI chat.");
  }

  if (!question.trim()) {
    throw new VotingDatabaseError("invalid_request", "Ask a question to get started.");
  }

  const detail = getPropositionDetailById(db, sessionId, propositionId).proposition;
  const requestedProvider = normalizeProviderPreference(providerPreference);
  const contentHash = hashPropositionContext(detail);
  const questionHash = hashChatQuestion(question);
  const cached = getCachedAiChatAnswer(db, propositionId, role, requestedProvider, questionHash, contentHash, PROMPT_VERSION);
  if (cached) {
    return {
      ...cached,
      cached: true,
    };
  }

  const prompt = buildChatPrompt(detail, role, question);
  const providers = getProviderCandidates(requestedProvider);
  let rateLimitedError: VotingDatabaseError | null = null;

  for (const provider of providers) {
    try {
      const parsed = await providerChat(provider, prompt, fetchImpl);
      const payload = buildChatResponse(
        {
          propositionId: detail.id,
          role,
          requestedProvider,
          question: question.trim(),
          answer: parsed.answer,
          sourcesUsed: sourcesUsedForDetail(detail),
        },
        provider,
        false,
      );
      storeAiChatAnswer(db, payload, questionHash, contentHash, PROMPT_VERSION);
      return payload;
    } catch (error) {
      if (error instanceof VotingDatabaseError && error.code === "rate_limited") {
        rateLimitedError = error;
      }
      console.error(`[ai] ${provider} chat failed`, error);
    }
  }

  if (rateLimitedError) {
    throw rateLimitedError;
  }

  throw new VotingDatabaseError(
    "delivery_failed",
    "Unable to reach an AI provider. Please ensure at least one provider key is configured.",
  );
};

type BuildDraftInput = {
  db: VotingDatabase;
  sessionId: string | null;
  propositionId: string;
  providerPreference?: AiProviderPreference;
  sourcePropositionIds?: string[];
  fetchImpl?: typeof fetch;
  clientIpAddress?: string | null;
};

const resolveDraftSourceDetails = (
  db: VotingDatabase,
  sessionId: string | null,
  sourcePropositionIds?: string[],
) => {
  const normalizedSourceIds = (() => {
    if (sourcePropositionIds && sourcePropositionIds.length > 0) {
      return Array.from(new Set(sourcePropositionIds.filter((sourceId) => typeof sourceId === "string" && sourceId.trim()))).map((sourceId) =>
        sourceId.trim(),
      );
    }

    return selectAiDraftSourcePropositions(listPropositionHistory(db).propositions, 3).map((proposition) => proposition.id);
  })();

  const uniqueSourceIds = Array.from(new Set(normalizedSourceIds)).slice(0, 5);
  if (uniqueSourceIds.length < 2) {
    throw new VotingDatabaseError(
      "invalid_request",
      "Choose at least two closed policies to synthesize a new open policy.",
    );
  }

  const sourceDetails = uniqueSourceIds.map((sourceId) => getPropositionDetailById(db, sessionId, sourceId).proposition);
  if (sourceDetails.some((detail) => detail.status !== "closed")) {
    throw new VotingDatabaseError("invalid_request", "Choose closed policies from the history view.");
  }

  return sourceDetails;
};

export const getPolicyDraft = async ({
  db,
  sessionId,
  propositionId,
  providerPreference,
  sourcePropositionIds,
  fetchImpl = fetch,
  clientIpAddress = null,
}: BuildDraftInput): Promise<PropositionAiDraftResponse> => {
  const session = getResolvedSession(db, sessionId);
  if (!session) {
    throw new VotingDatabaseError("authentication_required", "Sign in with a university account to generate a policy.");
  }

  const sourceDetails = resolveDraftSourceDetails(db, sessionId, sourcePropositionIds);
  const primarySource = sourceDetails[0];

  const requestedProvider = normalizeProviderPreference(providerPreference);
  const contentHash = hashPropositionSetContext(sourceDetails);
  const cacheKey = primarySource.id;
  const cached = getCachedAiPolicyDraft(db, cacheKey, requestedProvider, contentHash, DRAFT_PROMPT_VERSION);
  if (cached && cached.proposition.status !== "closed") {
    return {
      ...cached,
      cached: true,
    };
  }

  const prompt = buildDraftPrompt(sourceDetails);
  const providers = getProviderCandidates(requestedProvider);
  let rateLimitedError: VotingDatabaseError | null = null;

  for (const provider of providers) {
    let parsed: DraftModelPayload;
    try {
      parsed = await providerDraft(provider, prompt, fetchImpl);
    } catch (error) {
      if (error instanceof VotingDatabaseError) {
        if (error.code === "rate_limited") {
          rateLimitedError = error;
        }

        console.error(`[ai] ${provider} draft failed`, error);
        continue;
      }

      console.error(`[ai] ${provider} draft failed`, error);
      continue;
    }

    try {
      const draft = normalizeDraftPayload(parsed, sourceDetails, primarySource);

      const created = createProposition(
        db,
        sessionId,
        {
          title: draft.title,
          category: draft.category,
          scope: draft.scope,
          tldr: draft.tldr,
          bullets: draft.bullets,
          brief: buildAiPolicyBrief(draft, sourceDetails),
          closesAt: new Date(Date.now() + DRAFT_CLOSE_OFFSET_MS).toISOString(),
        },
        clientIpAddress,
      );

      markPropositionAiGenerated(db, created.proposition.id, sourceDetails.map((source) => source.id), draft.rationale);
      const createdWithMetadata = getPropositionDetailById(db, sessionId, created.proposition.id);

      const payload = buildDraftResponse(
        {
          sourcePropositionId: primarySource.id,
          sourcePropositionTitle: primarySource.title,
          sourcePropositionIds: sourceDetails.map((source) => source.id),
          sourcePropositionTitles: sourceDetails.map((source) => source.title),
          sourcePropositions: sourceDetails.map((source) => ({
            propositionId: source.id,
            title: source.title,
            path: source.path,
            supportPercent: source.supportPercent,
            turnoutCount: source.turnoutCount,
          })),
          sourceSupportPercent: primarySource.supportPercent,
          sourceTurnoutCount: primarySource.turnoutCount,
          requestedProvider,
          providerUsed: provider,
          rationale: draft.rationale,
          proposition: createdWithMetadata.proposition,
        },
        provider,
        false,
      );
      storeAiPolicyDraft(db, payload, contentHash, DRAFT_PROMPT_VERSION);
      return payload;
    } catch (error) {
      if (error instanceof VotingDatabaseError && error.code === "invalid_request") {
        console.error(`[ai] ${provider} draft creation failed`, error);
        continue;
      }

      throw error;
    }
  }

  if (rateLimitedError) {
    throw rateLimitedError;
  }

  throw new VotingDatabaseError(
    "delivery_failed",
    "Unable to reach an AI provider. Please ensure at least one provider key is configured.",
  );
};

export const reconcileAutomaticAiPolicies = async ({
  db,
  fetchImpl = fetch,
}: {
  db: VotingDatabase;
  fetchImpl?: typeof fetch;
}) => {
  if (automaticAiPublishInFlight) {
    return automaticAiPublishInFlight;
  }

  automaticAiPublishInFlight = (async () => {
    const status = getAutomaticAiPolicyBuilderStatus(db);
    if (status.activeCount >= status.limit || status.nextSourcePropositions.length < 2) {
      return status;
    }

    let currentStatus = status;
    while (currentStatus.activeCount < currentStatus.limit && currentStatus.nextSourcePropositions.length >= 2) {
      try {
        await getPolicyDraft({
          db,
          sessionId: AI_SYSTEM_SESSION_ID,
          propositionId: currentStatus.nextSourcePropositions[0].propositionId,
          sourcePropositionIds: currentStatus.nextSourcePropositions.map((source) => source.propositionId),
          providerPreference: "auto",
          fetchImpl,
        });
      } catch (error) {
        console.error("[ai] automatic policy publish failed", error);
        break;
      }

      currentStatus = getAutomaticAiPolicyBuilderStatus(db);
    }

    return currentStatus;
  })().finally(() => {
    automaticAiPublishInFlight = null;
  });

  return automaticAiPublishInFlight;
};
