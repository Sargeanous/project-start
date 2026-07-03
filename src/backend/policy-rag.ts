import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { delimitUntrusted, safeSummary } from "./agent-security";

export interface PolicyChunkMetadata {
  docId: string;
  docTitle: string;
  source?: string;
  jurisdiction?: string;
  status?: string;
  tags: string[];
  clauseId: string;
  clauseTitle: string;
  fileName: string;
  updatedAt: string;
}

export interface PolicyVectorRecord {
  id: string;
  text: string;
  metadata: PolicyChunkMetadata;
  embedding: number[];
  embeddingModel: string;
  embeddingSource: "openai" | "local";
}

export interface PolicySearchResult {
  id: string;
  score: number;
  text: string;
  citation: string;
  metadata: PolicyChunkMetadata;
}

export interface PolicySearchFilter {
  docId?: string;
  docIds?: string[];
  tags?: string[];
}

interface PolicyVectorStore {
  version: 1;
  generatedAt: string;
  records: PolicyVectorRecord[];
}

const KNOWLEDGE_DIR = join(process.cwd(), "knowledge");
const DATA_DIR = join(process.cwd(), ".dooh-data");
const VECTOR_FILE = join(DATA_DIR, "policy-vectors.json");
const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const LOCAL_EMBEDDING_MODEL = "local-hash-384";
const LOCAL_DIMENSIONS = 384;

export async function ingestPolicyKnowledge() {
  const docs = await readPolicyDocuments();
  const records: PolicyVectorRecord[] = [];
  for (const doc of docs) {
    const chunks = parsePolicyDocument(doc.fileName, doc.updatedAt, doc.content);
    for (const chunk of chunks) {
      const embedded = await embedPolicyText(`${chunk.metadata.clauseId} ${chunk.metadata.clauseTitle}\n${chunk.text}`);
      records.push({
        id: `${chunk.metadata.docId}:${chunk.metadata.clauseId}`,
        text: chunk.text,
        metadata: chunk.metadata,
        embedding: embedded.embedding,
        embeddingModel: embedded.model,
        embeddingSource: embedded.source,
      });
    }
  }
  const store: PolicyVectorStore = {
    version: 1,
    generatedAt: new Date().toISOString(),
    records,
  };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(VECTOR_FILE, JSON.stringify(store, null, 2), "utf8");
  return {
    generatedAt: store.generatedAt,
    documents: docs.length,
    chunks: records.length,
    embeddingSource: records.some((record) => record.embeddingSource === "openai") ? "openai" : "local",
    vectorFile: VECTOR_FILE,
  };
}

export async function getPolicyVectorStatus() {
  const store = await readVectorStore();
  return {
    ready: Boolean(store.records.length),
    generatedAt: store.generatedAt,
    chunks: store.records.length,
    documents: Array.from(new Set(store.records.map((record) => record.metadata.docId))),
    vectorFile: VECTOR_FILE,
  };
}

export async function retrievePolicy(query: string, k = 5, filter: PolicySearchFilter = {}): Promise<PolicySearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  let store = await readVectorStore();
  if (!store.records.length) {
    await ingestPolicyKnowledge();
    store = await readVectorStore();
  }
  const embedded = await embedPolicyText(trimmed);
  const filtered = applyFilter(store.records, filter);
  return filtered
    .map((record) => {
      const vectorScore = record.embedding.length === embedded.embedding.length
        ? cosineSimilarity(embedded.embedding, record.embedding)
        : 0;
      const lexical = lexicalScore(trimmed, `${record.metadata.clauseId} ${record.metadata.clauseTitle} ${record.text}`);
      return {
        id: record.id,
        score: Number((vectorScore + lexical * 0.2).toFixed(6)),
        text: record.text,
        citation: formatCitation(record),
        metadata: record.metadata,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(k, 12)));
}

export function formatPolicyContext(results: PolicySearchResult[]) {
  return delimitUntrusted("POLICY_CONTEXT", results.map((result) => ({
    citation: result.citation,
    clauseId: result.metadata.clauseId,
    docTitle: result.metadata.docTitle,
    text: result.text,
  })));
}

export function citationsFromPolicyResults(results: PolicySearchResult[]) {
  return Array.from(new Set(results.map((result) => result.metadata.clauseId).filter(Boolean)));
}

// Single swappable embedding boundary. Replace this function to move providers later.
export async function embedPolicyText(text: string): Promise<{ embedding: number[]; model: string; source: "openai" | "local" }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { embedding: localEmbedding(text), model: LOCAL_EMBEDDING_MODEL, source: "local" };

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: text.slice(0, 8000),
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return { embedding: localEmbedding(text), model: LOCAL_EMBEDDING_MODEL, source: "local" };
    const payload = await response.json() as { data?: Array<{ embedding?: number[] }> };
    const embedding = payload.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || !embedding.length) return { embedding: localEmbedding(text), model: LOCAL_EMBEDDING_MODEL, source: "local" };
    return { embedding, model: OPENAI_EMBEDDING_MODEL, source: "openai" };
  } catch {
    return { embedding: localEmbedding(text), model: LOCAL_EMBEDDING_MODEL, source: "local" };
  }
}

async function readPolicyDocuments() {
  try {
    const names = (await readdir(KNOWLEDGE_DIR)).filter((name) => name.endsWith(".md") && name.toLowerCase() !== "readme.md").sort();
    return Promise.all(names.map(async (fileName) => {
      const path = join(KNOWLEDGE_DIR, fileName);
      const fileStat = await stat(path);
      return {
        fileName,
        updatedAt: fileStat.mtime.toISOString(),
        content: await readFile(path, "utf8"),
      };
    }));
  } catch {
    return [];
  }
}

function parsePolicyDocument(fileName: string, updatedAt: string, content: string) {
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || basename(fileName, ".md");
  const metadata = parseHeaderMetadata(content);
  const docId = metadata["doc id"] || basename(fileName, ".md").toUpperCase();
  const base = {
    docId,
    docTitle: title.replace(/\s+/g, " "),
    source: metadata.source,
    jurisdiction: metadata.jurisdiction,
    status: metadata.status,
    tags: splitTags(metadata.tags),
    fileName,
    updatedAt,
  };
  const chunks: Array<{ text: string; metadata: PolicyChunkMetadata }> = [];
  const clauseRegex = /\*\*([A-Z]+-\d+(?:\.\d+)?)\s*(?:—|â€”|-)\s*([^*.]+)\.\*\*\s*([\s\S]*?)(?=\n\*\*[A-Z]+-\d+(?:\.\d+)?\s*(?:—|â€”|-)|\n##\s+|$)/g;
  for (const match of content.matchAll(clauseRegex)) {
    const clauseId = match[1].trim();
    const clauseTitle = normalizeText(match[2]);
    const body = normalizeText(match[3]);
    chunks.push({
      text: `${clauseId} | ${clauseTitle}. ${body}`.trim(),
      metadata: {
        ...base,
        clauseId,
        clauseTitle,
      },
    });
  }
  return chunks;
}

function parseHeaderMetadata(content: string) {
  const metadata: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^-\s+\*\*([^:]+):\*\*\s*(.+)$/);
    if (!match) continue;
    metadata[match[1].trim().toLowerCase()] = normalizeText(match[2]);
  }
  return metadata;
}

function splitTags(value = "") {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function readVectorStore(): Promise<PolicyVectorStore> {
  try {
    const store = JSON.parse(await readFile(VECTOR_FILE, "utf8")) as PolicyVectorStore;
    return { version: 1, generatedAt: store.generatedAt, records: Array.isArray(store.records) ? store.records : [] };
  } catch {
    return { version: 1, generatedAt: "", records: [] };
  }
}

function applyFilter(records: PolicyVectorRecord[], filter: PolicySearchFilter) {
  const docIds = new Set([...(filter.docIds ?? []), ...(filter.docId ? [filter.docId] : [])].map((id) => id.toUpperCase()));
  const tags = new Set((filter.tags ?? []).map((tag) => tag.toLowerCase()));
  return records.filter((record) => {
    if (docIds.size && !docIds.has(record.metadata.docId.toUpperCase())) return false;
    if (tags.size && !record.metadata.tags.some((tag) => tags.has(tag.toLowerCase()))) return false;
    return true;
  });
}

function formatCitation(record: PolicyVectorRecord) {
  return `${record.metadata.clauseId} | ${record.metadata.docTitle} | ${record.metadata.clauseTitle}`;
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function lexicalScore(query: string, text: string) {
  const queryTokens = new Set(tokens(query));
  if (!queryTokens.size) return 0;
  const textTokens = new Set(tokens(text));
  let hits = 0;
  queryTokens.forEach((token) => {
    if (textTokens.has(token)) hits += 1;
  });
  return hits / Math.sqrt(queryTokens.size * Math.max(textTokens.size, 1));
}

function localEmbedding(text: string) {
  const vector = new Array(LOCAL_DIMENSIONS).fill(0);
  for (const token of tokens(text)) {
    const hash = hashNumber(token);
    const index = Math.abs(hash) % LOCAL_DIMENSIONS;
    vector[index] += hash % 2 === 0 ? 1 : -1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / norm).toFixed(8)));
}

function tokens(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9.\-\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function hashNumber(value: string) {
  return createHash("sha256").update(value).digest().readInt32BE(0);
}

function normalizeText(value: string) {
  return safeSummary(value.replace(/â€”/g, "|").replace(/[—–]/g, "|").replace(/\s+/g, " ").trim(), 20000);
}
