const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(?<![\w-])(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]){2,}\d{3,}(?![\w-])/g;
const SECRET_RE = /\b(?:sk-[A-Za-z0-9_-]{16,}|OPENAI_API_KEY\s*=\s*\S+|Bearer\s+[A-Za-z0-9._-]+)\b/g;
const INJECTION_RE = /\b(ignore|disregard|override|forget)\b.{0,80}\b(previous|prior|above|system|developer|policy|rules|instructions)\b|\b(call|use|execute)\b.{0,80}\b(tool|function|api)\b|\bapprove\s+(me|this)\b/gi;

export interface GuardResult {
  ok: boolean;
  flagged: boolean;
  reason?: string;
  findings: string[];
  redacted: string;
}

export function redactPII(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactPII);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, redactPII(nested)]));
  }
  return value;
}

export function redactText(value: string) {
  return value
    .replace(SECRET_RE, "[REDACTED_SECRET]")
    .replace(EMAIL_RE, "[REDACTED_EMAIL]")
    .replace(PHONE_RE, "[REDACTED_PHONE]");
}

export function detectPromptInjection(value: string): GuardResult {
  const matches = Array.from(value.matchAll(INJECTION_RE)).map((match) => redactText(match[0]));
  return {
    ok: matches.length === 0,
    flagged: matches.length > 0,
    reason: matches.length ? "prompt_injection_pattern" : undefined,
    findings: matches.map((match) => `Possible instruction injection: ${match}`),
    redacted: redactText(value),
  };
}

export function delimitUntrusted(label: string, value: unknown) {
  return [
    `BEGIN_UNTRUSTED_${label}`,
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
    `END_UNTRUSTED_${label}`,
  ].join("\n");
}

export function safeSummary(value: unknown, max = 240) {
  const text = typeof value === "string" ? value : JSON.stringify(redactPII(value));
  return redactText(text).slice(0, max);
}
