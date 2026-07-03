import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assets } from "../data";
import { triageSubmission } from "./agent-runner";
import { appendAgentAudit, createPendingAgentAction } from "./agent-store";
import { getState } from "./dooh-store";
import { hasOpenAIKey } from "./openai";
import { ingestPolicyKnowledge } from "./policy-rag";

export type AgentJobType = "triage" | "yield_review" | "stale_sweep" | "ops_digest" | "ingest_document";
export type AgentJobStatus = "pending" | "running" | "done" | "failed";

export interface AgentJob {
  id: string;
  type: AgentJobType;
  payload: Record<string, unknown>;
  runAt: string;
  status: AgentJobStatus;
  attempts: number;
  lastError?: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentJobResult {
  job: AgentJob;
  result?: unknown;
  error?: string;
}

const DATA_DIR = join(process.cwd(), ".dooh-data");
const JOBS_FILE = join(DATA_DIR, "agent-jobs.json");
const MAX_ATTEMPTS = 3;
const MAX_DUE_PER_RUN = 3;
const RETAINED_JOBS = 500;
const BASE_BACKOFF_MS = 60_000;
const RATE_LIMIT_MS_BY_TYPE: Record<AgentJobType, number> = {
  triage: 2_000,
  yield_review: 60_000,
  stale_sweep: 60_000,
  ops_digest: 60_000,
  ingest_document: 30_000,
};

const lastRunByType = new Map<AgentJobType, number>();
let jobLock: Promise<unknown> = Promise.resolve();
let workerInterval: ReturnType<typeof setInterval> | null = null;

export function getAutonomyStatus() {
  const openAIKeyPresent = hasOpenAIKey();
  const envEnabled = process.env.AGENT_AUTONOMY_ENABLED === "true";
  return {
    workerEnabled: envEnabled && openAIKeyPresent,
    envEnabled,
    openAIKeyPresent,
    backendPersistence: "local-json-adapter",
    approvalPolicy: "all_writes_require_human_approval",
    autoExecuteAllowlist: [],
    maxAttempts: MAX_ATTEMPTS,
    concurrencyCap: MAX_DUE_PER_RUN,
    schedule: {
      staleSweep: "hourly",
      opsDigest: "daily_06_local",
      yieldReview: "nightly_02_local",
    },
  };
}

export async function listAgentJobs(status?: AgentJobStatus) {
  const jobs = await readJobs();
  return status ? jobs.filter((job) => job.status === status) : jobs;
}

export async function enqueueAgentJob(input: {
  type: AgentJobType;
  payload?: Record<string, unknown>;
  runAt?: string;
  idempotencyKey?: string;
  actor?: string;
  role?: string;
}) {
  return withJobLock(async () => {
    const jobs = await readJobs();
    const now = new Date().toISOString();
    const runAt = normalizeRunAt(input.runAt);
    const idempotencyKey = input.idempotencyKey || buildIdempotencyKey(input.type, input.payload || {}, runAt);
    const existing = jobs.find((job) => job.idempotencyKey === idempotencyKey);
    if (existing) return existing;

    const job: AgentJob = {
      id: makeId("JOB"),
      type: input.type,
      payload: sanitizePayload(input.payload || {}),
      runAt,
      status: "pending",
      attempts: 0,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    jobs.unshift(job);
    await writeJobs(jobs.slice(0, RETAINED_JOBS));
    await appendAgentAudit({
      actor: input.actor || "MediaGPT Autonomy",
      role: input.role || "system",
      kind: "job_enqueued",
      tool: input.type,
      args: { jobId: job.id, runAt: job.runAt, idempotencyKey: job.idempotencyKey },
      resultSummary: `Queued ${job.type} job`,
    });
    return job;
  });
}

export async function runDueAgentJobs(options: {
  actor?: string;
  role?: string;
  limit?: number;
  manual?: boolean;
} = {}): Promise<{ status: ReturnType<typeof getAutonomyStatus>; ran: AgentJobResult[] }> {
  const status = getAutonomyStatus();
  if (!options.manual && !status.workerEnabled) return { status, ran: [] };

  const limit = Math.min(Math.max(Number(options.limit || MAX_DUE_PER_RUN), 1), MAX_DUE_PER_RUN);
  const ran: AgentJobResult[] = [];
  for (let index = 0; index < limit; index += 1) {
    const job = await claimDueJob(options.actor, options.role);
    if (!job) break;
    ran.push(await executeClaimedJob(job, options.actor || "MediaGPT Autonomy", options.role || "admin"));
  }
  return { status, ran };
}

export async function tickAgentScheduler(actor = "MediaGPT Scheduler", role = "system") {
  const now = new Date();
  const hourKey = now.toISOString().slice(0, 13);
  const dateKey = now.toISOString().slice(0, 10);
  const enqueued: AgentJob[] = [];

  // Hourly operational hygiene: review stale submissions and propose reviewer nudges.
  enqueued.push(await enqueueAgentJob({
    type: "stale_sweep",
    payload: { scope: "submitted_and_in_review" },
    idempotencyKey: `scheduler:stale_sweep:${hourKey}`,
    actor,
    role,
  }));

  if (now.getHours() === 6) {
    enqueued.push(await enqueueAgentJob({
      type: "ops_digest",
      payload: { date: dateKey, audience: "shift_start" },
      idempotencyKey: `scheduler:ops_digest:${dateKey}`,
      actor,
      role,
    }));
  }

  if (now.getHours() === 2) {
    enqueued.push(await enqueueAgentJob({
      type: "yield_review",
      payload: { zone: "Reem Island", assetId: "AD-HWY-001" },
      idempotencyKey: `scheduler:yield_review:${dateKey}`,
      actor,
      role,
    }));
  }

  return { enqueued };
}

export function startAutonomyWorker() {
  const status = getAutonomyStatus();
  if (!status.workerEnabled) {
    if (workerInterval) {
      clearInterval(workerInterval);
      workerInterval = null;
    }
    return { started: false, status };
  }
  if (workerInterval) return { started: true, status };
  workerInterval = setInterval(() => {
    void tickAgentScheduler().then(() => runDueAgentJobs()).catch((error) => {
      console.error("MediaGPT autonomy worker failed", error);
    });
  }, 60_000);
  void tickAgentScheduler().then(() => runDueAgentJobs()).catch((error) => {
    console.error("MediaGPT autonomy worker failed", error);
  });
  return { started: true, status };
}

async function claimDueJob(actor = "MediaGPT Autonomy", role = "system") {
  return withJobLock(async () => {
    const nowMs = Date.now();
    const jobs = await readJobs();
    const index = jobs.findIndex((job) => job.status === "pending" && Date.parse(job.runAt) <= nowMs && isWithinRateLimit(job.type, nowMs));
    if (index === -1) return null;

    const claimed: AgentJob = {
      ...jobs[index],
      status: "running",
      attempts: jobs[index].attempts + 1,
      updatedAt: new Date().toISOString(),
    };
    jobs[index] = claimed;
    await writeJobs(jobs);
    lastRunByType.set(claimed.type, nowMs);
    await appendAgentAudit({
      actor,
      role,
      kind: "job_claimed",
      tool: claimed.type,
      args: { jobId: claimed.id, attempt: claimed.attempts },
      resultSummary: `Claimed ${claimed.type} job`,
    });
    return claimed;
  });
}

async function executeClaimedJob(job: AgentJob, actor: string, role: string): Promise<AgentJobResult> {
  try {
    const result = await runJobHandler(job, actor, role);
    const done = await patchJob(job.id, {
      status: "done",
      lastError: undefined,
      updatedAt: new Date().toISOString(),
    });
    await appendAgentAudit({
      actor,
      role,
      kind: "job_done",
      tool: job.type,
      args: { jobId: job.id, attempts: done.attempts },
      resultSummary: summarizeResult(result),
    });
    return { job: done, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed";
    const failed = await failOrBackoff(job, message);
    await appendAgentAudit({
      actor,
      role,
      kind: "job_failed",
      tool: job.type,
      args: { jobId: job.id, attempts: failed.attempts, status: failed.status },
      resultSummary: message,
    });
    return { job: failed, error: message };
  }
}

async function runJobHandler(job: AgentJob, actor: string, role: string) {
  if (job.type === "triage") {
    const submissionId = stringValue(job.payload.submissionId);
    if (!submissionId) throw new Error("triage job requires payload.submissionId");
    return triageSubmission({ submissionId, actor, role: role === "system" ? "admin" : role });
  }

  if (job.type === "yield_review") {
    const assetId = stringValue(job.payload.assetId, assets[0]?.id || "AD-HWY-001");
    const asset = assets.find((item) => item.id === assetId) || assets[0];
    const recommendedPrice = Number(job.payload.price || 447000);
    const zone = stringValue(job.payload.zone, asset?.zone || "network");
    return createPendingAgentAction({
      tool: "adjustPrice",
      args: {
        assetId,
        price: recommendedPrice,
        reason: `Autonomous yield review for ${zone}: demand is above plan, propose finance review before applying.`,
      },
      preview: `Review target price for ${assetId} at AED ${recommendedPrice.toLocaleString("en-US")}`,
      requestedBy: actor,
      role: "finance",
      idempotencyKey: job.idempotencyKey,
    });
  }

  if (job.type === "stale_sweep") {
    const state = await getState();
    const candidates = state.submissions.filter((submission) => ["Submitted", "In review"].includes(submission.stage)).slice(0, 5);
    const actions = [];
    for (const submission of candidates) {
      actions.push(await createPendingAgentAction({
        tool: "sendSubmissionNudge",
        args: {
          id: submission.id,
          message: `${submission.campaign} is still ${submission.stage}. Please review or return it to the bidder with a clear note.`,
        },
        preview: `Send stale-submission nudge for ${submission.id}`,
        requestedBy: actor,
        role: "reviewer",
        idempotencyKey: `stale_nudge:${submission.id}:${new Date().toISOString().slice(0, 10)}`,
      }));
    }
    return { candidates: candidates.length, proposedActions: actions.length };
  }

  if (job.type === "ops_digest") {
    const state = await getState();
    const openAlerts = state.alerts.filter((alert) => alert.state !== "Live on network").length;
    const staleSubmissions = state.submissions.filter((submission) => ["Submitted", "In review"].includes(submission.stage)).length;
    return createPendingAgentAction({
      tool: "publishOpsDigest",
      args: {
        audience: "ADMO control-room shift",
        summaryEn: `${openAlerts} alerts need follow-up, ${staleSubmissions} CMS submissions are still waiting, and AD-HWY-009 remains the main offline asset.`,
        summaryAr: `${openAlerts} تنبيهات تحتاج متابعة، و${staleSubmissions} طلبات CMS لا تزال بانتظار المعالجة، والأصل AD-HWY-009 هو الأصل المتوقف الأهم.`,
      },
      preview: "Publish 06:00 MediaGPT state-of-the-estate digest",
      requestedBy: actor,
      role: "control-room",
      idempotencyKey: job.idempotencyKey,
    });
  }

  if (job.type === "ingest_document") {
    return ingestPolicyKnowledge();
  }

  throw new Error(`Unsupported job type: ${job.type}`);
}

async function failOrBackoff(job: AgentJob, message: string) {
  const nextStatus: AgentJobStatus = job.attempts >= MAX_ATTEMPTS ? "failed" : "pending";
  const backoffMs = BASE_BACKOFF_MS * Math.max(1, 2 ** (job.attempts - 1));
  return patchJob(job.id, {
    status: nextStatus,
    lastError: message,
    runAt: nextStatus === "pending" ? new Date(Date.now() + backoffMs).toISOString() : job.runAt,
    updatedAt: new Date().toISOString(),
  });
}

async function patchJob(id: string, patch: Partial<AgentJob>) {
  return withJobLock(async () => {
    const jobs = await readJobs();
    const index = jobs.findIndex((job) => job.id === id);
    if (index === -1) throw new Error("Job not found");
    jobs[index] = { ...jobs[index], ...patch };
    await writeJobs(jobs);
    return jobs[index];
  });
}

function isWithinRateLimit(type: AgentJobType, nowMs: number) {
  const lastRun = lastRunByType.get(type) || 0;
  return nowMs - lastRun >= RATE_LIMIT_MS_BY_TYPE[type];
}

function normalizeRunAt(value?: string) {
  if (!value) return new Date().toISOString();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function buildIdempotencyKey(type: AgentJobType, payload: Record<string, unknown>, runAt: string) {
  if (type === "triage" && payload.submissionId) return `triage:${String(payload.submissionId)}`;
  if (type === "yield_review" && payload.assetId) return `yield_review:${String(payload.assetId)}:${runAt.slice(0, 10)}`;
  if (type === "ops_digest") return `ops_digest:${runAt.slice(0, 10)}`;
  if (type === "stale_sweep") return `stale_sweep:${runAt.slice(0, 13)}`;
  if (type === "ingest_document") return `ingest_document:${String(payload.fileName || payload.docId || "all")}`;
  return `${type}:${stableStringify(payload)}:${runAt}`;
}

function sanitizePayload(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => `${key}:${stableStringify(nested)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function summarizeResult(result: unknown) {
  if (Array.isArray(result)) return `${result.length} records`;
  if (result && typeof result === "object") {
    const keys = Object.keys(result as Record<string, unknown>).slice(0, 4);
    return keys.length ? `Returned ${keys.join(", ")}` : "Returned object";
  }
  return String(result ?? "Job completed");
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function readJobs() {
  try {
    return JSON.parse(await readFile(JOBS_FILE, "utf8")) as AgentJob[];
  } catch {
    return [];
  }
}

async function writeJobs(jobs: AgentJob[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2), "utf8");
}

async function withJobLock<T>(task: () => Promise<T>): Promise<T> {
  const previous = jobLock;
  let release!: () => void;
  jobLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous.catch(() => undefined);
  try {
    return await task();
  } finally {
    release();
  }
}
