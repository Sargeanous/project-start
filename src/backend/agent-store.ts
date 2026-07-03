import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { redactPII } from "./agent-security";

export type AgentActionStatus = "pending" | "approved" | "rejected" | "executed" | "failed";
export type AgentToolKind = "read" | "write";

export interface PendingAgentAction {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  preview: string;
  requestedBy: string;
  role: string;
  createdAt: string;
  status: AgentActionStatus;
  idempotencyKey?: string;
  decidedBy?: string;
  decidedAt?: string;
  result?: unknown;
}

export interface AgentAuditEntry {
  id: string;
  ts: string;
  actor: string;
  role: string;
  kind:
    | "agent_run"
    | "tool_read"
    | "tool_write_queued"
    | "action_approved"
    | "action_rejected"
    | "action_failed"
    | "triage"
    | "model_call"
    | "guard_block"
    | "trace"
    | "job_enqueued"
    | "job_claimed"
    | "job_done"
    | "job_failed";
  tool?: string;
  args?: Record<string, unknown>;
  resultSummary: string;
  threadId?: string;
  actionId?: string;
  trace?: AgentTraceEntry;
}

export interface AgentTraceEntry {
  runId?: string;
  feature: string;
  model?: string;
  tool?: string;
  stepIndex?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  latencyMs: number;
  success: boolean;
  reason?: string;
  outcomeSummary: string;
}

const DATA_DIR = join(process.cwd(), ".dooh-data");
const ACTIONS_FILE = join(DATA_DIR, "agent-actions.json");
const AUDIT_FILE = join(DATA_DIR, "agent-audit.json");

export async function listPendingAgentActions(status?: AgentActionStatus) {
  const actions = await readJson<PendingAgentAction[]>(ACTIONS_FILE, []);
  return status ? actions.filter((action) => action.status === status) : actions;
}

export async function getPendingAgentAction(id: string) {
  const actions = await readJson<PendingAgentAction[]>(ACTIONS_FILE, []);
  return actions.find((action) => action.id === id) ?? null;
}

export async function createPendingAgentAction(action: Omit<PendingAgentAction, "id" | "createdAt" | "status">) {
  const actions = await readJson<PendingAgentAction[]>(ACTIONS_FILE, []);
  if (action.idempotencyKey) {
    const existing = actions.find((item) => item.idempotencyKey === action.idempotencyKey);
    if (existing) return existing;
  }
  const next: PendingAgentAction = {
    ...action,
    id: makeId("ACT"),
    idempotencyKey: action.idempotencyKey || makeId("IDEMP"),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  actions.unshift(next);
  await writeJson(ACTIONS_FILE, actions.slice(0, 200));
  return next;
}

export async function updatePendingAgentAction(id: string, patch: Partial<PendingAgentAction>) {
  const actions = await readJson<PendingAgentAction[]>(ACTIONS_FILE, []);
  const index = actions.findIndex((action) => action.id === id);
  if (index === -1) throw new Error("Pending action not found");
  actions[index] = { ...actions[index], ...patch };
  await writeJson(ACTIONS_FILE, actions);
  return actions[index];
}

export async function appendAgentAudit(entry: Omit<AgentAuditEntry, "id" | "ts">) {
  const audit = await readJson<AgentAuditEntry[]>(AUDIT_FILE, []);
  const next: AgentAuditEntry = {
    ...(redactPII(entry) as Omit<AgentAuditEntry, "id" | "ts">),
    id: makeId("AUD"),
    ts: new Date().toISOString(),
  };
  audit.unshift(next);
  await writeJson(AUDIT_FILE, audit.slice(0, 500));
  return next;
}

export async function listAgentAudit(limit = 100) {
  const audit = await readJson<AgentAuditEntry[]>(AUDIT_FILE, []);
  return audit.slice(0, limit);
}

export async function appendAgentTrace(entry: AgentTraceEntry, actor = "System", role = "system") {
  return appendAgentAudit({
    actor,
    role,
    kind: "trace",
    resultSummary: entry.outcomeSummary,
    tool: entry.tool,
    trace: entry,
  });
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2), "utf8");
}
