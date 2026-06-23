# Production checklist

Use this checklist before depending on TekMemo in production. Every item has the *how* alongside the *what*.

## Local package usage

### Validate memory in CI

Run `tekmemo validate` on every PR so a malformed `.tekmemo/` never lands on main:

```bash
# CI step
npx tekmemo validate
echo $?  # 0 = ok; non-zero = warnings/errors found
```

For stricter checks (treat warnings as failures):

```bash
npx tekmemo validate --strict
```

### Keep secrets out of `.tekmemo/`

The write blocklist is the backstop, but don't rely on it alone:

- Never paste credentials into `remember` commands or `notes.record()` calls.
- Add `.tekmemo/secrets.json` to `.gitignore` (it's the dev-only resolver fallback — never a sync unit).
- Review `git diff .tekmemo/` in PRs the same way you review code.

### Snapshot before risky changes

Snapshots are immutable point-in-time backups. Take one before large automated refactors, agent runs, or sync operations so you can restore:

```bash
npx tekmemo snapshot --label "pre-v2-refactor"
# ...something went wrong...
npx tekmemo restore --label "pre-v2-refactor"
```

### Pin package versions

TekMemo is pre-1.0 (`alpha`). Pin exact versions in production, not ranges:

```json
{
  "dependencies": {
    "@tekbreed/tekmemo": "1.0.0-alpha.0",
    "@tekbreed/tekmemo-cli": "1.0.0-alpha.0"
  }
}
```

## Cloud usage

### Use the cloud client helpers

Import cloud helpers from `@tekbreed/tekmemo` (never hand-roll fetch calls against the API). The client handles envelope unwrapping, typed errors, retries, and secret redaction:

```ts
import { createTekMemoCloudClient } from "@tekbreed/tekmemo";

const client = createTekMemoCloudClient({
  baseUrl: "https://memo.tekbreed.com/api/v1",
  apiKey: process.env.TEKMEMO_API_KEY!, // server-side only
});
```

### Keep API keys server-side

Cloud API keys authenticate sync and API calls. They belong in server-side secrets only:

- ✅ Workers Secret / env var / secret manager.
- ❌ Browser bundles, client-side env, committed `.env`.

### Scope and handle keys

- Create keys with the minimum scope required (per-machine keys like `"ci"`, `"laptop"` beat one god-key).
- Show the raw key once at provisioning; only a salted hash is stored.
- Handle typed cloud errors (`isTekMemoCloudError`) for auth, rate-limit, and network failures:

```ts
import { isTekMemoCloudError } from "@tekbreed/tekmemo";

try {
  await client.memory.readCore();
} catch (error) {
  if (isTekMemoCloudError(error)) {
    // error.code, error.status — typed, redacted
  }
}
```

### Set request timeouts

The cloud client accepts `timeoutMs` — set it to fail fast instead of hanging:

```ts
const client = createTekMemoCloudClient({
  baseUrl: "https://memo.tekbreed.com/api/v1",
  apiKey: process.env.TEKMEMO_API_KEY!,
  timeoutMs: 10_000,
});
```

## Agent usage

### Read context before planning

Instruct agents to call `tekmemo context` (or the MCP `tekmemo_context` tool) *before* planning work, so they operate on existing decisions rather than re-deriving them.

### Store only durable memory

Ask agents to persist decisions, constraints, and resolved facts — not scratch state or transient reasoning. The durability classifier handles the default, but a clear instruction improves signal:

> Record only what a future session must know: decisions made, constraints discovered, bugs solved and their fix.

### Gate writes for untrusted clients

- **MCP read-only mode** for shared/untrusted clients — disables write tools entirely.
- **Approval-gated write tools** for autonomous loops — require human approval before a write lands.

## See also

- [Errors](./errors) — the typed error hierarchy and redaction.
- [Security](./architecture/security) — the threat model and write blocklist.
- [Configuration](./configuration) — env vars, resolution priority, timeouts.
- [The `Tekmemo` client](./client) — the full API surface.
