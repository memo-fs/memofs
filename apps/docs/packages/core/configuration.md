# Configuration

TekMemo uses a clear priority chain to resolve configuration settings:
1. **Constructor Options** (Highest priority)
2. **Environment Variables**
3. **Workspace Configuration File** (`.tekmemo/config.json`)
4. **Default Fallbacks** (Lowest priority)

---

## Runtime Modes

When initializing `Tekmemo`, you can select one of three runtime modes:

| Mode | Target | Description |
|---|---|---|
| `local` | Off-grid / Zero Config | All reads and writes occur directly on the local filesystem. Zero cloud dependencies. |
| `hybrid` | Cloud Sync Enabled | Reads and writes are mirrored to a remote replica (e.g. TekMemo Cloud) using sync policies. |
| `memory` | In-Memory Only | No disk access. Primitives are read and written to memory. Great for transient tests. |

```ts
const memo = new Tekmemo({
  mode: "local", // or "hybrid", "memory"
});
```

---

## Sync Policies (Hybrid Mode)

In `hybrid` mode, read and write operations are guided by policies:

| Policy | Behavior |
|---|---|
| `local-first` | Serve/Write locally first, and synchronize changes in the background (default). |
| `cloud-first` | Query the remote replica first for the latest state; fall back to local disk if offline. |
| `local-only` | Prevent all remote network calls for this execution, keeping operations strictly local. |

```ts
const memo = new Tekmemo({
  mode: "hybrid",
  readPolicy: "local-first",
  writePolicy: "local-first",
});
```

---

## Workspace Config (`.tekmemo/config.json`)

The `.tekmemo/config.json` allows team-wide settings to be committed alongside code:

```json
{
  "runtime": "local",
  "projectId": "project-abc",
  "recall": {
    "engine": "hybrid",
    "embeddingModel": "openai/text-embedding-3-small"
  },
  "cloud": {
    "baseUrl": "https://memo.tekbreed.com"
  }
}
```

---

## Environment Variables

The following environment variables are recognized:

| Variable | Description |
|---|---|
| `TEKMEMO_MODE` | Overrides the runtime mode (`local`, `hybrid`, `memory`). |
| `TEKMEMO_READ_POLICY` | Overrides the read policy (`local-first`, `cloud-first`, `local-only`). |
| `TEKMEMO_WRITE_POLICY` | Overrides the write policy (`local-first`, `cloud-first`, `local-only`). |
| `TEKMEMO_CLOUD_API_KEY`| The API key used to authenticate with TekMemo Cloud. |
| `TEKMEMO_PROJECT_ID` | The unique ID of the target project workspace. |
