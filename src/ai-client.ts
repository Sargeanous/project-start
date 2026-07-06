type AISource = "openai" | "offline";

export type AIEnvelope<T> = T & {
  ok?: boolean;
  source: AISource;
  reason?: string;
  model?: string;
  tokens?: number;
  latencyMs?: number;
};

export interface BroadcastCopy {
  en: string;
  ar: string;
}

export interface TicketDraft {
  title: string;
  summary: string;
  likelyCause: string;
  steps: string[];
  partsNeeded: string[];
  slaSuggestion: string;
}

export interface OpsDigest {
  en: string;
  ar: string;
}

export interface CreativeConcept {
  headline_en: string;
  headline_ar: string;
  body_en: string;
  body_ar: string;
  ratio: string;
}

export interface CreativeCopy {
  concepts: CreativeConcept[];
}

export interface ReportSummary {
  summary: string;
}

export interface EstateFilter {
  status?: string;
  zone?: string;
  type?: string;
  controller?: string;
  freeText?: string;
}

export interface SubmissionTags {
  industry: string;
  riskTier: "low" | "medium" | "high";
  suggestedApprover: string;
  suggestedWindow: string;
  tags: string[];
}

export interface YieldExplanation {
  explanation: string;
  adjustment: string;
}

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
  reason?: string;
}

export interface ChatAnswer {
  answer: string;
  table?: string[][];
  chart?: {
    type: "bar" | "line";
    title: string;
    xKey: string;
    yKey: string;
    data: Array<Record<string, string | number>>;
  };
  suggestedActions?: string[];
}

export interface AgentToolTrace {
  tool: string;
  kind: "read" | "write";
  status: "executed" | "queued_for_approval" | "blocked" | "failed";
  summary: string;
  actionId?: string;
}

export interface PendingAgentAction {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  preview: string;
  requestedBy: string;
  role: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected" | "executed" | "failed";
  decidedBy?: string;
  decidedAt?: string;
  result?: unknown;
}

export interface AgentRunResponse {
  reply: string;
  proposedActions: PendingAgentAction[];
  toolTrace: AgentToolTrace[];
  source: AISource;
  reason?: string;
}

export interface SubmissionTriageResponse {
  proposal: {
    decision: string;
    recommendedStage: string;
    summary: string;
    reasons: string[];
    citations?: string[];
    issueDetected: boolean;
    injectionDetected?: boolean;
  };
  action: PendingAgentAction | null;
  source: AISource;
}

export async function aiStatus() {
  return aiGet<{ available: boolean; source: AISource }>("status");
}

export function generateBroadcast(payload: { brief: string; severity: string; zones: string[] }) {
  return aiPost<BroadcastCopy>("generateBroadcast", payload);
}

export function draftTicket(payload: { asset: string; componentId: string; symptom: string; severity: string }) {
  return aiPost<TicketDraft>("draftTicket", payload);
}

export function opsDigest() {
  return aiPost<OpsDigest>("opsDigest", {});
}

export function generateCreativeCopy(payload: { brief: string; tone: string; ratios: string[] }) {
  return aiPost<CreativeCopy>("generateCreativeCopy", payload);
}

export interface GeneratedVisual { image: string; source?: string }
export function generateVisual(payload: { brief: string; headline?: string; style?: string }) {
  return aiPost<GeneratedVisual>("generateVisual", payload);
}

export interface VisualReview {
  verdict: string;
  scores: Array<{ label: string; value: number; tone: string }>;
  findings: Array<{ label: string; ok: boolean }>;
  recommendations: string[];
}
export function reviewVisual(payload: { image: string; brief?: string }) {
  return aiPost<VisualReview>("reviewVisual", payload);
}

export function summarizeReport(payload: { scope: string }) {
  return aiPost<ReportSummary>("summarizeReport", payload);
}

export function parseEstateQuery(payload: { query: string }) {
  return aiPost<EstateFilter>("parseEstateQuery", payload);
}

export function tagSubmission(payload: { submission: unknown }) {
  return aiPost<SubmissionTags>("tagSubmission", payload);
}

export function explainYield(payload: { budget: number; demand: number; discount: number; computedTarget: number }) {
  return aiPost<YieldExplanation>("explainYield", payload);
}

export function askMediaGPT(payload: { query: string; locale?: "en" | "ar"; history?: Array<{ role: "user" | "assistant"; body: string }> }) {
  return aiPost<ChatAnswer>("ask", payload);
}

export function runMediaGPTAgent(payload: { message: string; threadId?: string; role: string; actor: string }) {
  return doohPost<AgentRunResponse>("agent/run", payload);
}

export function listAgentActions(status = "pending") {
  return doohGet<{ actions: PendingAgentAction[] }>(`agent/actions/${status}`);
}

export function approveAgentAction(payload: { id: string; actor: string; role: string }) {
  return doohPost<{ action: PendingAgentAction }>(`agent/actions/${payload.id}/approve`, payload);
}

export function rejectAgentAction(payload: { id: string; actor: string; role: string; reason?: string }) {
  return doohPost<{ action: PendingAgentAction }>(`agent/actions/${payload.id}/reject`, payload);
}

export function triageSubmission(payload: { submissionId: string; actor: string; role: string }) {
  return doohPost<SubmissionTriageResponse>("agent/triage", payload);
}

export function moderateText(payload: { text: string }) {
  return aiPost<ModerationResult>("moderateText", payload);
}

export async function transcribeAudio(file: Blob) {
  const form = new FormData();
  form.append("audio", file, "mediagpt-input.webm");
  return aiFetch<{ text: string }>("transcribeAudio", { method: "POST", body: form });
}

export async function ttsBroadcast(payload: { text: string }) {
  const response = await fetch("/api/dooh/ai/ttsBroadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return { ok: false, source: "offline" as const, reason: "network_error" };
  return response;
}

async function aiGet<T>(path: string): Promise<AIEnvelope<T>> {
  return aiFetch<T>(path, { method: "GET" });
}

async function aiPost<T>(path: string, payload: unknown): Promise<AIEnvelope<T>> {
  return aiFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function aiFetch<T>(path: string, init: RequestInit): Promise<AIEnvelope<T>> {
  try {
    const response = await fetch(`/api/dooh/ai/${path}`, init);
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) return { source: "offline", reason: "network_error" } as AIEnvelope<T>;
    return payload as AIEnvelope<T>;
  } catch {
    return { source: "offline", reason: "network_error" } as AIEnvelope<T>;
  }
}

async function doohGet<T>(path: string): Promise<AIEnvelope<T>> {
  return doohFetch<T>(path, { method: "GET" });
}

async function doohPost<T>(path: string, payload: unknown): Promise<AIEnvelope<T>> {
  return doohFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function doohFetch<T>(path: string, init: RequestInit): Promise<AIEnvelope<T>> {
  try {
    const response = await fetch(`/api/dooh/${path}`, init);
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) return { source: "offline", reason: "network_error" } as AIEnvelope<T>;
    return { ...payload, source: payload.source ?? "openai" } as AIEnvelope<T>;
  } catch {
    return { source: "offline", reason: "network_error" } as AIEnvelope<T>;
  }
}
