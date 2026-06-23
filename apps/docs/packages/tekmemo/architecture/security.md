# Security architecture

TekMemo handles two categories of sensitive data: **secrets** (API keys, tokens, provider credentials) and **memory content** (your project's notes and decisions, which may themselves contain secrets if an agent scrapes a `.env`). The security model keeps both out of the wrong places — out of sync replicas, out of logs, out of opaque prompts.

The unifying principle is simple: **store an opaque reference, never the secret itself.** It shows up twice — once for connector credentials, once for memory content.

## The two secret planes

### 1. Connector credentials — the `secretRef` model

[Connectors](../connectors) need tokens to fetch from GitHub, Notion, etc. Those tokens **never** touch disk or the sync replica. Instead:

- `.tekmemo/connectors.json` carries only an opaque `secretRef` (e.g. `"ss_github_main"`).
- A `SecretResolver` resolves that ref to a live token **at run time**, in memory only.
- The token is never written to a file, never logged, never serialized.

The dev fallback is `.tekmemo/secrets.json` — a `{ secretRef: token }` map that is **gitignored** and **not a sync unit**. Production resolves against the cloud secret endpoint, a vault, or any injected resolver. See [Connectors → Secret resolution](../connectors#secret-resolution).

### 2. Memory content — the write blocklist

The harder case: an agent reads a `.env` and helpfully writes `OPENAI_API_KEY=sk-...` into `notes.md`. That's a security hole, because `notes.md` syncs to the cloud replica and sits on disk in plaintext.

The **write blocklist** (`detectBlockedContent`) stops this at the gate. It's a deterministic, always-on, **no-LLM** layer (ADR 0009 Component 6) that runs on every write:

- **High precision over high recall.** v1 favors a leaked secret slipping through over a legitimate note about auth being rejected. Rejected writes are disruptive and erode trust.
- **Targets real secret shapes** — provider key prefixes (`sk-...`, `ghp_...`, `tk_live_...`), PEM blocks, JWTs, and structured `key=value` assignments requiring a digit and 12+ characters. So `"password: must be rotated"` and `"we use bcrypt"` (documentation) never trip.
- **Never echoes the secret.** A violation carries a redacted preview (first 3 chars + `…` + last 1), never the full match. Error messages and logs propagate only the preview.
- **Deterministic by default.** There is no LLM path for the blocklist — secrets are rejected regardless of configuration.

A blocked write throws `MemoryWriteBlockedError` with the redacted preview and the rule id that matched. The content never reaches `notes.md`.

```ts
import { MemoryWriteBlockedError } from "@tekbreed/tekmemo";

try {
  await memo.notes.record({ content: "OPENAI_API_KEY=sk-proj-abc123...", kind: "note" });
} catch (error) {
  if (error instanceof MemoryWriteBlockedError) {
    console.error(error.ruleId, error.preview); // "openai-key", "sk-…3"
  }
}
```

## Threat model

| Threat | Defense |
| --- | --- |
| Secret committed to `.tekmemo/` by an agent | Write blocklist rejects secret-shaped content before it hits the files. |
| Connector token synced to cloud / committed | `secretRef` model — tokens resolve at runtime, never ride in the file replica. |
| Dev secrets file leaking | `.tekmemo/secrets.json` is gitignored and not a sync unit. |
| Agent writing arbitrary paths inside `.tekmemo/` | `assertMemoryPath` enforces a strict allowlist — only the 11 canonical files + named snapshots. No `..`, no absolute paths, no null bytes. |
| Cloud API key in a browser bundle | API keys are server-side only; the cloud client is for Node/edge runtimes, not the browser. |
| Secret echoed in an error or log | Blocklist violations carry a redacted preview; the cloud client redacts `tk_live_...`, `Bearer ...`, and provider keys from all error messages. |
| Untrusted MCP client mutating memory | MCP read-only mode disables write tools entirely. |

## Rules

### Do

- **Keep API keys server-side.** The cloud client belongs in a Node, Worker, or server runtime — never a browser bundle.
- **Use scoped TekMemo Cloud API keys** with the minimum permissions required.
- **Rely on the write blocklist** as the backstop — but don't *depend* on it; never deliberately write a secret.
- **Require approval for agent writes** when running an autonomous loop. The MCP server supports approval-gated write tools.
- **Use MCP read-only mode** for untrusted or shared clients.

### Do not

- **Put TekMemo Cloud API keys in browser bundles.**
- **Store private keys or tokens in `.tekmemo/`.** The canonical files sync and sit in plaintext.
- **Let agents write arbitrary filesystem paths.** The path allowlist is the boundary; don't work around it.
- **Commit `.tekmemo/secrets.json`.** It's gitignored for a reason.

## See also

- [Connectors](../connectors) — the `secretRef` / `SecretResolver` model.
- [Memory filesystem](../filesystem-layout) — the canonical-file allowlist and path validation.
- [Memory intelligence](../intelligence) — where the blocklist sits in the write pipeline.
- [Errors](../errors) — `MemoryWriteBlockedError` and the cloud error hierarchy with redaction.
- ADR 0002 — *the `secretRef` model (reference, never store).*
- ADR 0009 — *write intelligence (blocklist + durability tier).*
