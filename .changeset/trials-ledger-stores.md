---
"@memofs/core": minor
---

# @memofs/core — Trials ledger and warrant-state stores

- Added the ticket-1 Trials stores: append-only `trials/assignments.jsonl` + `trials/outcomes.jsonl` ledger (exposure assignment → independent validator outcome with source-state fingerprints) and the `warrants/<memory-id>.json` current-state file with `warrants/history.jsonl` transitions. Reads on a fresh workspace return `[]` / `candidate`; trial results never touch original memory files.
- Added governed `trials/` + `warrants/` path families (`createWarrantPath`, `memoryTypeFromPath` kinds, sync path recognition). Trial ledgers are created lazily on first append — `bootstrapMemoryStore` output is unchanged (`BOOTSTRAP_FILE_PATHS` split out from the canonical list).
