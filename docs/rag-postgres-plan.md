# MediaGPT RAG and Autonomy Persistence Plan

The current project-start backend persists DOOH state and agent approvals in local JSON files under `.dooh-data`. I did not find an active Postgres integration in the application code, so true pgvector RAG is intentionally not enabled yet.

## What is ready now

- A local durable autonomy queue adapter mirrors the requested job shape.
- Jobs produce proposals only. Human approval remains required for writes.
- RAG DDL is prepared in `src/backend/rag-postgres-schema.sql`.

## What must be confirmed before enabling RAG

1. Postgres connection string and deployment target.
2. `CREATE EXTENSION vector` availability.
3. Document source: upload UI, folder, admin table, or object storage.
4. Data residency signoff for sending policy documents to OpenAI embeddings.
5. Embedding provider fallback if OpenAI embeddings are not allowed.

## Intended RAG flow

1. Admin uploads or registers a policy document.
2. An `ingest_document` job chunks it with overlap.
3. The embedding provider writes vectors to `rag_chunks`.
4. A read-only `searchPolicy` tool retrieves top-k chunks by query and optional filters.
5. Triage and compliance agents cite `title`, `source`, and chunk text in their recommendations.

Retrieved text must always be treated as untrusted context. It can ground model analysis, but it must never trigger platform writes.
