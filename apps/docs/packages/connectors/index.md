# Connectors Framework

`@memofs/connectors` provides a local ingestion framework to load external data sources (GitHub issues, Notion databases, etc.) into Memo FS memory.

Following our local-first architecture, connectors execute strictly on the local machine. Only the resulting memory files are synced to the cloud — API tokens and secrets never leave your local environment.

---

## How It Works

```
.memofs/connectors.json ──► runConnectors() ──► .memofs/notes.md (+ indexes)
 (config, no tokens)          (local engine)        (source: "connector")
```

1. **Configuration:** Stored in `.memofs/connectors.json`. Defines enabled sources and references secrets by an opaque `secretRef`.
2. **Secret Resolution:** Tokens are fetched at runtime via a `SecretResolver`. They are held only in memory and never written to disk.
3. **Connector Execution:** Ingests external items, normalizes them, and writes them to `.memofs/notes.md`.

---

## Installation

```bash
npm install @memofs/connectors
```

---

## Quick Start

Run connectors programmatically in your workspace:

```ts
import { MemoFS } from "@memofs/core";
import { runConnectors, EnvSecretResolver } from "@memofs/connectors";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

const store = createNodeFsMemoryStore({ rootDir: "./.memofs" });
const memo = new MemoFS({ store, projectId: "my-app" });

const result = await runConnectors({
  rootDir: "./.memofs",
  memo,
  secretResolver: new EnvSecretResolver({ rootDir: "./.memofs" }),
});

console.log(`Ingested ${result.written.length} new notes.`);
```

---

## Workspace Configuration (`connectors.json`)

Configure your connectors in `.memofs/connectors.json`. Each entry contains details about the source, but never raw credentials:

```json
{
  "connectors": [
    {
      "id": "github-issues",
      "type": "github",
      "enabled": true,
      "schedule": "@hourly",
      "sourceMapping": {
        "repository": "christophersesugh/memofs",
        "kinds": ["issues"]
      },
      "secretRef": "github_pat_reference"
    }
  ]
}
```

---

## Built-In Connectors

### 1. GitHub (`"github"`)
Ingests GitHub issues, pull requests, and discussions using GitHub's GraphQL API.
- **Source Mapping Options:**
  - `repository` (string, required): `"owner/repo"`.
  - `kinds` (string[]): `["issues", "prs", "discussions"]`.
  - `limit` (number): Max items to fetch (default: `50`).

### 2. Notion (`"notion"`)
Ingests Notion pages from a database or search endpoint.
- **Source Mapping Options:**
  - `databaseId` (string): 32-character Notion database ID.
  - `searchQuery` (string): Keyword query to filter workspace pages.
  - `limit` (number): Max pages to fetch.

---

## Secret Resolution

During execution, the runner resolves `secretRef` strings to actual tokens using a `SecretResolver`:

- **Development/Local:** Reads credentials from a local, gitignored `.memofs/secrets.json` file.
- **Cloud/Hosted:** Reaches out to a secure vault or server env to pull keys at execution runtime.
