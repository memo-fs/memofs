# Configuration

MemoFS uses a clear priority chain to resolve configuration settings:
1. **Constructor Options** (Highest priority)
2. **Environment Variables**
3. **Workspace Configuration File** (`.memofs/config.json`)
4. **Default Fallbacks** (Lowest priority)

---

## Runtime Modes

When initializing `MemoFS`, you can select one of two runtime modes:

| Mode | Target | Description |
|---|---|---|
| `local` | Off-grid / Zero Config | All reads and writes occur directly on the local filesystem. Zero cloud dependencies. |
| `hybrid` | Cloud Sync Enabled | Same local engine, plus a cloud replica. Sync via explicit `sync.push` / `sync.pull` verbs — no implicit read/write policies. |

```ts
const memo = new MemoFS({
  mode: "local", // or "hybrid"
});
```

---

## Sync Verbs (Hybrid Mode)

In `hybrid` mode, the cloud is reached via two explicit verbs only — there are no read/write policies:

- **`sync.push`** — compute manifest, upload changed blobs, advance the sync cursor.
- **`sync.pull`** — download changed files, remove deleted ones, re-derive indexes.

Reads and writes always hit the local engine. The cloud is a file replica, not a runtime mode.

```ts
const memo = new MemoFS({
  mode: "hybrid",
  cloud: {
    baseUrl: process.env.MEMOFS_CLOUD_URL!,
    apiKey: process.env.MEMOFS_CLOUD_API_KEY!,
  },
});
```

---

## Workspace Config (`.memofs/config.json`)

The `.memofs/config.json` allows team-wide settings to be committed alongside code:

```json
{
  "runtime": "local",
  "projectId": "project-abc",
  "recall": {
    "engine": "hybrid",
    "embeddingModel": "openai/text-embedding-3-small"
  },
  "cloud": {
    "baseUrl": "https://memo.memofs.dev"
  }
}
```

---

## Environment Variables

The following environment variables are recognized:

| Variable | Description |
|---|---|
| `MEMOFS_RUNTIME` | Overrides the runtime mode (`local`, `hybrid`). |
| `MEMOFS_CLOUD_URL` | Base URL of the MemoFS Cloud replica (for hybrid mode). |
| `MEMOFS_API_KEY` | The API key used to authenticate with MemoFS Cloud. |
| `MEMOFS_PROJECT_ID` | The unique ID of the target project workspace. |
| `MEMOFS_RECALL_ENGINE` | Recall strategy: `lexical`, `vector`, `hybrid`, or `auto`. |
| `MEMOFS_LOCAL_EMBEDDINGS` | Enable local ONNX embeddings (`"1"` or `"true"`). |
| `MEMOFS_EMBEDDING_MODEL` | Local embedding model id (Transformers.js compatible). |
