# Knowledge Pack — RAG source documents

Source documents for the platform's RAG grounding (compliance agent citations). Drafted in dooh
(testing repo); copy this folder into project-start for ingestion.

## Contents

| File | Doc ID | What it is | Authority level |
|---|---|---|---|
| `uae-media-content-standards.md` | MCS | The 20 UAE Media Content Standards, cleaned and clause-numbered | Official text basis |
| `uae-advertising-guide-summary.md` | ADG | Working summary of the UAE Advertisement Guide (prohibited/restricted categories, children, language, outdoor rules) | Working summary — verify against official guide |
| `dooh-internal-content-policy.md` | ICP | The operator's internal screening policy: verdicts, category matrix, the five checks, AI rules, escalation | Internal policy |

Official reference (not ingestable yet): `uae-national-media-council-advertising-guide-english-v2.pdf`
(user's Downloads) is a scanned, image-only PDF — it needs OCR before it can join the pack. Until then,
ADG stands in for it and is marked as a working summary.

## Design for RAG

- Every clause has a stable ID (`MCS-07`, `ADG-2.1`, `ICP-1.3`). Agents cite these IDs so reviewers can
  verify the rule. Chunk on clause boundaries (each `**ID — title.** text` block is one natural chunk).
- Frontmatter-style metadata at the top of each doc (Doc ID, jurisdiction, status, tags) is intended for
  the ingestion metadata / retrieval filters.
- ICP is the operational layer: it maps the legal rules to the platform's actual verdicts
  (approve/review/reject), the five analysis checks, risk-score bands, and the human-approval rule.

## Updating

- Replace ADG with clause-accurate text once the official guide is OCR'd/verified.
- ICP is owned by Content Operations; keep clause IDs stable when editing (add new IDs, avoid renumbering).
