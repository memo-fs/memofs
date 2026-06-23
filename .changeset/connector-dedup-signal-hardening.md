---
"@tekbreed/tekmemo-connectors": patch
---

Connector runner + fetch hardening (code-review phase 2).

- **fix(dedup):** `loadExistingNoteIds` now scans the full memory-events log
  for note ids instead of `listRecentMemories({ limit: 500 })`, which capped
  dedup at the 500 most-recent events. Older connector notes fell out of the
  window → their content-derived `conn_` id was no longer seen → the identical
  note was re-written on every subsequent run (unbounded duplicate growth).
  Falls back to the recent-memory scan when the events log is unavailable.
- **fix(fetch):** AbortSignal from `RunConnectorsOptions.signal` is now
  threaded through both connectors into every `fetch()` (it was declared on
  the ingest context but never used).
- **fix(fetch):** Each GitHub/Notion request now carries a 30s timeout
  (composite signal) so a stalled endpoint can't hang the whole sequential run.
- **fix(notion):** 401/403 now throw `NotionAuthError` (authorization/permission
  failure) instead of `NotionRateLimitError`. Previously an invalid/expired
  token looked like throttling, so a caller retrying on rate-limit would loop
  forever. 429 remains the rate-limit signal.
- **fix(notion):** The non-ok error path no longer inlines the response body
  into the error message — an API echoing request bytes back could otherwise
  leak material into the surfaced error.
- **chore:** Removed dead `void repository` code in the GitHub fetch layer.
