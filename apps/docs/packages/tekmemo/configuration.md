# Configuration

TekMemo resolves configuration with a strict priority chain so the same package works for local apps, cloud apps, hybrid setups, and tests.

## Resolution priority

For every setting, `Tekmemo` and the CLI/MCP packages follow this order:

1. **Constructor / CLI args** (highest priority)
2. **Environment variables**
3. **`.tekmemo/config.json`** (lowest project priority)
4. **Built-in defaults**

A value set higher in the list always wins.

## Local

```bash
tekmemo config init --runtime local
```

Or in code:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({ mode: "local", rootDir: "./.tekmemo" });
```

## Cloud-backed memory

There is no `mode: "cloud"`. Cloud is a **sync transport** — a file replica of your local
`.tekmemo/`. Configure the cloud endpoint and reach it in hybrid mode:

```bash
export TEKMEMO_CLOUD_URL="https://memo.tekbreed.com/api/v1"
export TEKMEMO_API_KEY="tk_live_..."
export TEKMEMO_PROJECT_ID="proj_123"
```

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({
  mode: "hybrid",
  rootDir: "./.tekmemo",
  cloud: {
    baseUrl: "https://memo.tekbreed.com/api/v1",
    apiKey: process.env.TEKMEMO_API_KEY!,
  },
});

// Mirror local memory to the cloud replica
await memo.sync.push({ /* files */ });
```

## Hybrid

```bash
tekmemo config init \
  --runtime hybrid \
  --cloud-url https://memo.tekbreed.com/api/v1 \
  --project-id proj_123 \
  --read-policy local-first \
  --write-policy local-first
```

In hybrid mode, every read and write is routed through the [read/write policies](./client#read-and-write-policies). Cloud configuration (`baseUrl` + `apiKey`, or a `cloudClient` instance) is required.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `TEKMEMO_ROOT` | Root directory for local memory (defaults to `.`). |
| `TEKMEMO_RUNTIME` | Runtime mode: `local`, `hybrid`, or `memory`. (There is no `cloud` mode — cloud is a sync transport.) |
| `TEKMEMO_PROJECT_ID` | Default Cloud project (defaults to `default`). |
| `TEKMEMO_WORKSPACE_ID` | Optional caller-side workspace context. |
| `TEKMEMO_CLOUD_URL` | Cloud API base URL (e.g. ending in `/memo/v1`). Also accepted as `TEKMEMO_API_URL`. |
| `TEKMEMO_API_KEY` | TekMemo Cloud API key. |
| `TEKMEMO_CLOUD_TIMEOUT_MS` | Cloud request timeout in milliseconds (positive integer). |
| `TEKMEMO_READ_POLICY` | Hybrid read policy (`local-first`, `cloud-first`, or `local-only`). |
| `TEKMEMO_WRITE_POLICY` | Hybrid write policy (`local-first`, `cloud-first`, or `local-only`). |
| `TEKMEMO_RECALL_ENGINE` | Local recall strategy: `lexical`, `vector`, `hybrid`, or `auto` (default). |
| `TEKMEMO_LOCAL_EMBEDDINGS` | Set to `1` or `true` to lazy-load a local ONNX embedder for hybrid recall with zero API keys. |
| `TEKMEMO_EMBEDDING_MODEL` | Transformers.js-compatible local embedding model id (default `Xenova/all-MiniLM-L6-v2`). |

## `.tekmemo/config.json` properties

| Field | Description |
| --- | --- |
| `runtime` | `"local"`, `"hybrid"`, or `"memory"`. |
| `root` | Relative path to the folder where memory operations should run. |
| `projectId` | Default Cloud project. |
| `workspaceId` | Optional caller-side workspace context. |
| `cloud.baseUrl` | TekMemo Cloud URL. |
| `cloud.apiKey` | TekMemo Cloud API key. Avoid committing keys; prefer env vars. |
| `cloud.workspaceId` | Default workspace ID. |
| `cloud.projectId` | Default project ID. |
| `cloud.timeoutMs` | Timeout in milliseconds (positive integer). |
| `hybrid.readPolicy` | `"local-first"`, `"cloud-first"`, or `"local-only"`. |
| `hybrid.writePolicy` | `"local-first"`, `"cloud-first"`, or `"local-only"`. |
| `recall.engine` | `"lexical"`, `"vector"`, `"hybrid"`, or `"auto"` (default). See [Recall engine](#recall-engine). |
| `recall.localEmbeddings` | `true` to lazy-load a local ONNX embedder for zero-API-key hybrid recall. Defaults to `false`. |
| `recall.embeddingModel` | Transformers.js-compatible model id (default `Xenova/all-MiniLM-L6-v2`). |

## Recall engine

Local and hybrid modes retrieve memory through a configurable **recall engine**. In local mode, recall works with **zero configuration**: by default it uses lexical-only retrieval (BM25 + fuzzy matching), so you can search memory with no embedder and no API keys.

The engine has four strategies:

| `engine` | How it retrieves | Requires an embedder? |
| --- | --- | --- |
| `lexical` | BM25 + fuzzy keyword matching only. | No |
| `vector` | Semantic embeddings only. | Yes |
| `hybrid` | Both paths merged, reranked, and weighted by recency + confidence. | Yes |
| `auto` (default) | `hybrid` when an embedder is available, else `lexical`. | No (falls back to lexical) |

### Zero-config hybrid recall

To get hybrid (semantic + lexical) recall **without any API keys**, enable the
local ONNX embedder. It runs in-process via
[`@tekbreed/tekmemo-adapter-transformers`](https://docs.memo.tekbreed.com/api/tekmemo/provider-adapters)
and only downloads the model on the first recall:

```bash
export TEKMEMO_RECALL_ENGINE=auto
export TEKMEMO_LOCAL_EMBEDDINGS=true
```

```json
{
  "$schema": "https://docs.memo.tekbreed.com/1.0.0-alpha.0/config.schema.json",
  "runtime": "local",
  "recall": {
    "engine": "auto",
    "localEmbeddings": true
  }
}
```

If the local embedder fails or the adapter is not installed, writes and recall
keep working — TekMemo falls back to lexical (BM25 + fuzzy) retrieval so memory
stays discoverable. A failing embedder never breaks a write.

### Using a provider embedder

For higher-quality semantic recall, plug in a provider adapter instead. With an
embedder configured, `engine: "auto"` automatically upgrades to hybrid:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";
import { createOpenAIEmbedder } from "@tekbreed/tekmemo-adapter-openai";

const memo = new Tekmemo({
  rootDir: "./.tekmemo",
  projectId: "my-app",
  embedder: createOpenAIEmbedder({ apiKey: process.env.OPENAI_API_KEY! }),
  recall: { engine: "auto" },
});
```

## Configuration file

`.tekmemo/config.json` stores project-specific defaults so you don't need to specify flags on every command. Generate one using the CLI:

```bash
npx tekmemo config init --runtime hybrid
```

### Schema

Reference the schema from your config file for editor validation:

```json
{
  "$schema": "https://docs.memo.tekbreed.com/1.0.0-alpha.0/config.schema.json",
  "runtime": "hybrid",
  "root": ".",
  "cloud": {
    "baseUrl": "https://memo.tekbreed.com/api/v1",
    "projectId": "proj_123",
    "workspaceId": "ws_456",
    "timeoutMs": 10000
  },
  "hybrid": {
    "readPolicy": "local-first",
    "writePolicy": "local-first"
  },
  "recall": {
    "engine": "auto",
    "localEmbeddings": true
  }
}
```

The CLI also reads `mcp.runtime`, `mcp.readPolicy`, and `mcp.writePolicy` for backwards compatibility, but the top-level `runtime` and `hybrid.*` keys are preferred.
