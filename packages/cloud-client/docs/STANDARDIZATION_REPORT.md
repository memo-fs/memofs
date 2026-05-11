# Standardization Report

This version corrects the generated `@tekmemo/cloud-client` package to match the Cloud-Aligned TekMemo runbook.

## Changed from older generated client

- Replaced unscoped route assumptions such as `/context`, `/recall`, `/memories`, and `/graph` with project-scoped routes.
- Replaced canonical `{ ok, data }` assumption with `{ data, meta } / { error, meta }`.
- Updated examples to use `tk_live_...` API keys.
- Added sync push/pull/status/conflict APIs.
- Added cloud runtime helpers.
- Added hybrid runtime policy helpers.
- Added stricter input validation and URL encoding.
- Added tests for routing, envelope parsing, auth, validation, retries, and hybrid fallback behavior.

## Kept intentionally

- Package name remains `@tekmemo/cloud-client` because the aligned runbook still names this as the combined cloud client/runtime package.
- Legacy envelope parsing remains opt-in/on-by-default for transitional compatibility, but strict mode can disable it.
- Graph APIs are not implemented in this client yet because cloud graph routes are future/pending after `@tekmemo/graph` is published and installed.

## Not included

- Cloudflare Worker handlers.
- D1 repositories.
- Better Auth internals.
- Polar billing internals.
- BYOK encrypted credential storage.
- R2 snapshots/exports.
- Queues/Durable Objects/KV bindings.

Those belong in `tekmemo-cloud`.
