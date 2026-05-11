# Security Model

`@tekmemo/mcp-server` assumes MCP tools may be invoked by an LLM client. Every write operation must be protected by host-side policy.

## Runtime modes

| Mode | Security posture |
| --- | --- |
| `local` | Reads/writes local `.tekmemo/` files under the configured root |
| `memory` | Test/demo only; no durable writes |
| `cloud` | Requires `@tekmemo/cloud-client` and API-key policy |
| `hybrid` | Requires local policy plus cloud API-key policy |

## Required host responsibilities

The host app must enforce:

- user consent for write operations
- workspace/project authorization
- tenant isolation
- API key validation
- rate limiting
- audit logging
- secret redaction
- filesystem sandboxing
- connector access policy
- billing/credit policy

## Package-level safeguards

This package provides:

- operation safety classification
- read-only server mode
- authorization hook
- bounded input size
- bounded output size
- request timeout
- strict JSON metadata validation
- source ref validation
- cursor namespace validation
- duplicate batch validation
- `isError: true` tool failures

## API keys

Do not store cloud API keys in `.tekmemo/config.json`.

Use environment variables or OS secret storage:

```bash
TEKMEMO_API_KEY=tk_live_...
```

`@tekmemo/mcp-server` should receive a cloud client instance. `@tekmemo/cloud-client` should own auth headers, response parsing, retries, rate limits, and secret masking.

## Non-goals

This package does not provide:

- auth UI
- OAuth
- cloud session storage
- tenant database policy
- cloud API key hashing
- billing logic
- connector credentials
- model/provider calls
- vector DB access

Those belong in the host application or dedicated TekMemo packages.
