import { appendAgentTrace } from "./agent-store";
import { safeSummary } from "./agent-security";

type OpenAIResult =
  | {
      ok: true;
      text: string;
      data?: never;
      model: string;
      tokens: number;
      latencyMs: number;
      source: "openai";
    }
  | {
      ok: true;
      text?: never;
      data: unknown;
      model: string;
      tokens: number;
      latencyMs: number;
      source: "openai";
    }
  | {
      ok: false;
      text?: string;
      data?: unknown;
      model: string;
      tokens: 0;
      latencyMs: number;
      source: "offline";
      reason: string;
    };

export interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
  };
}

export type OpenAIChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content?: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

type OpenAIToolResult =
  | {
      ok: true;
      message: {
        content?: string | null;
        tool_calls?: OpenAIToolCall[];
      };
      model: string;
      tokens: number;
      latencyMs: number;
      source: "openai";
    }
  | {
      ok: false;
      message?: never;
      model: string;
      tokens: 0;
      latencyMs: number;
      source: "offline";
      reason: string;
    };

export interface StrictJsonSchemaOption {
  name: string;
  schema: Record<string, unknown>;
}

export interface CallOpenAIOptions {
  system: string;
  user: string;
  json?: boolean;
  schema?: StrictJsonSchemaOption;
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
  image?: string | null;
  feature?: string;
}

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_ATTEMPTS = 3;
const DEFAULT_COST_PER_1K: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4o": { input: 0.005, output: 0.015 },
};

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function moderateInput(text: string, feature = "moderation"): Promise<{ ok: true; flagged: boolean; categories: string[]; source: "openai" } | { ok: false; flagged: false; categories: string[]; source: "offline"; reason: string }> {
  const started = Date.now();
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false, flagged: false, categories: [], source: "offline", reason: "missing_key" };
  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { ok: false, flagged: false, categories: [], source: "offline", reason: `openai_${response.status}` };
    const payload = await response.json() as { results?: Array<{ flagged?: boolean; categories?: Record<string, boolean> }> };
    const result = payload.results?.[0];
    const categories = Object.entries(result?.categories ?? {}).filter(([, value]) => value).map(([key]) => key);
    void appendAgentTrace({
      feature,
      model: "omni-moderation-latest",
      latencyMs: Date.now() - started,
      success: true,
      outcomeSummary: result?.flagged ? `Moderation flagged: ${categories.join(", ")}` : "Moderation clear",
    });
    return { ok: true, flagged: Boolean(result?.flagged), categories, source: "openai" };
  } catch {
    return { ok: false, flagged: false, categories: [], source: "offline", reason: "moderation_error" };
  }
}

// Generative visual (gpt-image-1). Returns a data URL on success, or an
// offline result so the caller can fall back to a composed template.
export async function generateImage({
  prompt,
  size = "1536x1024",
  timeoutMs = 60000,
  feature = "generateVisual",
}: { prompt: string; size?: string; timeoutMs?: number; feature?: string }):
  Promise<{ ok: true; dataUrl: string; model: string; source: "openai" } | { ok: false; source: "offline"; reason: string }> {
  const started = Date.now();
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false, source: "offline", reason: "missing_key" };
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, size, n: 1 }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      void appendAgentTrace({ feature, model, latencyMs: Date.now() - started, success: false, reason: `openai_${response.status}`, outcomeSummary: "Image generation failed" });
      return { ok: false, source: "offline", reason: `openai_${response.status}` };
    }
    const payload = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> };
    const b64 = payload.data?.[0]?.b64_json;
    const url = payload.data?.[0]?.url;
    const dataUrl = b64 ? `data:image/png;base64,${b64}` : url;
    if (!dataUrl) return { ok: false, source: "offline", reason: "no_image" };
    void appendAgentTrace({ feature, model, latencyMs: Date.now() - started, success: true, outcomeSummary: "Image generated" });
    return { ok: true, dataUrl, model, source: "openai" };
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "image_error";
    return { ok: false, source: "offline", reason };
  }
}

export async function callOpenAI({
  system,
  user,
  json = false,
  schema,
  model = process.env.OPENAI_MODEL || DEFAULT_MODEL,
  maxTokens = 500,
  timeoutMs = 30000,
  image = null,
  feature = "callOpenAI",
}: CallOpenAIOptions): Promise<OpenAIResult> {
  const started = Date.now();
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return offline(model, started, "missing_key");

  const content = image
    ? [
        { type: "text", text: user },
        { type: "image_url", image_url: { url: image, detail: "low" } },
      ]
    : user;

  const responseFormat = schema
    ? { type: "json_schema", json_schema: { name: schema.name, schema: schema.schema, strict: true } }
    : json
      ? { type: "json_object" }
      : undefined;

  const requestBody = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
    max_tokens: maxTokens,
    temperature: 0.35,
    ...(responseFormat ? { response_format: responseFormat } : {}),
  };

  const response = await postWithRetry({
    key,
    model,
    body: requestBody,
    timeoutMs,
    started,
    feature,
  });

  if (!response.ok && schema && response.reason === "openai_400") {
    const fallbackResponse = await postWithRetry({
      key,
      model,
      body: { ...requestBody, response_format: { type: "json_object" } },
      timeoutMs: Math.max(500, timeoutMs - (Date.now() - started)),
      started,
      feature: `${feature}:json_object_fallback`,
    });
    return parseTextResponse(fallbackResponse, json || Boolean(schema), model, started, feature);
  }

  return parseTextResponse(response, json || Boolean(schema), model, started, feature);
}

export async function callOpenAITools({
  messages,
  tools,
  model = process.env.OPENAI_MODEL || DEFAULT_MODEL,
  maxTokens = 900,
  timeoutMs = 30000,
  feature = "agentRun",
  runId,
  stepIndex,
}: {
  messages: OpenAIChatMessage[];
  tools: OpenAIToolDefinition[];
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
  feature?: string;
  runId?: string;
  stepIndex?: number;
}): Promise<OpenAIToolResult> {
  const started = Date.now();
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return offlineTools(model, started, "missing_key");

  const response = await postWithRetry({
    key,
    model,
    body: {
      model,
      messages,
      tools,
      tool_choice: "auto",
      max_tokens: maxTokens,
      temperature: 0.2,
    },
    timeoutMs,
    started,
    feature,
    runId,
    stepIndex,
  });

  if (!response.ok) return offlineTools(model, started, response.reason);
  const message = response.payload.choices?.[0]?.message ?? {};
  return {
    ok: true,
    message,
    model: response.payload.model || model,
    tokens: response.payload.usage?.total_tokens ?? 0,
    latencyMs: Date.now() - started,
    source: "openai",
  };
}

interface OpenAIPayload {
  choices?: Array<{ message?: { content?: string | null; tool_calls?: OpenAIToolCall[] } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  model?: string;
}

type RetryResponse =
  | { ok: true; payload: OpenAIPayload }
  | { ok: false; reason: string; text?: string };

async function postWithRetry({
  key,
  model,
  body,
  timeoutMs,
  started,
  feature,
  runId,
  stepIndex,
}: {
  key: string;
  model: string;
  body: Record<string, unknown>;
  timeoutMs: number;
  started: number;
  feature: string;
  runId?: string;
  stepIndex?: number;
}): Promise<RetryResponse> {
  let lastReason = "openai_error";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const remainingMs = timeoutMs - (Date.now() - started);
    if (remainingMs <= 0) return { ok: false, reason: "timeout" };

    const attemptStarted = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(250, remainingMs));
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.ok) {
        const payload = (await response.json()) as OpenAIPayload;
        void traceModelCall({ feature, runId, stepIndex, model: payload.model || model, payload, latencyMs: Date.now() - attemptStarted, success: true, outcomeSummary: "OpenAI call succeeded" });
        return { ok: true, payload };
      }

      lastReason = `openai_${response.status}`;
      if (!isRetryableStatus(response.status) || attempt === MAX_ATTEMPTS - 1) {
        void traceModelCall({ feature, runId, stepIndex, model, latencyMs: Date.now() - attemptStarted, success: false, reason: lastReason, outcomeSummary: "OpenAI call failed" });
        return { ok: false, reason: lastReason, text: await response.text().catch(() => "") };
      }
    } catch (error) {
      lastReason = error instanceof Error && error.name === "AbortError" ? "timeout" : "openai_error";
      if (attempt === MAX_ATTEMPTS - 1) {
        void traceModelCall({ feature, runId, stepIndex, model, latencyMs: Date.now() - attemptStarted, success: false, reason: lastReason, outcomeSummary: "OpenAI call failed" });
        return { ok: false, reason: lastReason };
      }
    } finally {
      clearTimeout(timeout);
    }

    await sleep(backoffMs(attempt));
  }
  return { ok: false, reason: lastReason };
}

function parseTextResponse(response: RetryResponse, parseJson: boolean, model: string, started: number, feature: string): OpenAIResult {
  if (!response.ok) return offline(model, started, response.reason, response.text);
  const text = response.payload.choices?.[0]?.message?.content?.trim() || "";
  const usedModel = response.payload.model || model;
  const tokens = response.payload.usage?.total_tokens ?? 0;

  if (!parseJson) return { ok: true, text, model: usedModel, tokens, latencyMs: Date.now() - started, source: "openai" };

  try {
    return { ok: true, data: JSON.parse(text), model: usedModel, tokens, latencyMs: Date.now() - started, source: "openai" };
  } catch {
    void traceModelCall({ feature, model: usedModel, latencyMs: Date.now() - started, success: false, reason: "parse_error", outcomeSummary: safeSummary(text) });
    return offline(usedModel, started, "parse_error", text);
  }
}

function offline(model: string, started: number, reason: string, text?: string): OpenAIResult {
  return {
    ok: false,
    model,
    tokens: 0,
    latencyMs: Date.now() - started,
    source: "offline",
    reason,
    ...(text ? { text } : {}),
  };
}

function offlineTools(model: string, started: number, reason: string): OpenAIToolResult {
  return {
    ok: false,
    model,
    tokens: 0,
    latencyMs: Date.now() - started,
    source: "offline",
    reason,
  };
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

function backoffMs(attempt: number) {
  return Math.round((250 * 2 ** attempt) + Math.random() * 180);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateCost(model: string, promptTokens = 0, completionTokens = 0) {
  const pricing = DEFAULT_COST_PER_1K[model] ?? DEFAULT_COST_PER_1K[DEFAULT_MODEL];
  return Number((((promptTokens / 1000) * pricing.input) + ((completionTokens / 1000) * pricing.output)).toFixed(6));
}

async function traceModelCall({
  feature,
  runId,
  stepIndex,
  model,
  payload,
  latencyMs,
  success,
  reason,
  outcomeSummary,
}: {
  feature: string;
  runId?: string;
  stepIndex?: number;
  model: string;
  payload?: OpenAIPayload;
  latencyMs: number;
  success: boolean;
  reason?: string;
  outcomeSummary: string;
}) {
  const promptTokens = payload?.usage?.prompt_tokens ?? 0;
  const completionTokens = payload?.usage?.completion_tokens ?? 0;
  await appendAgentTrace({
    feature,
    runId,
    stepIndex,
    model,
    promptTokens,
    completionTokens,
    totalTokens: payload?.usage?.total_tokens ?? promptTokens + completionTokens,
    estimatedCostUsd: estimateCost(model, promptTokens, completionTokens),
    latencyMs,
    success,
    reason,
    outcomeSummary: safeSummary(outcomeSummary),
  });
}
