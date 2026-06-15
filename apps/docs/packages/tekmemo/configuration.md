# Configuration

TekMemo packages prefer explicit runtime configuration.

## Local

```bash
tekmemo config init --runtime local
```

## Cloud

```bash
export TEKMEMO_CLOUD_URL="https://memo.tekbreed.com/api/v1"
export TEKMEMO_API_KEY="tk_live_..."
export TEKMEMO_PROJECT_ID="proj_123"
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

## Environment variables

| Variable | Purpose |
| --- | --- |
| `TEKMEMO_CLOUD_URL` | Cloud API base URL ending in `/api/v1`. |
| `TEKMEMO_API_KEY` | TekMemo Cloud API key. |
| `TEKMEMO_PROJECT_ID` | Default Cloud project. |
| `TEKMEMO_WORKSPACE_ID` | Optional caller-side workspace context. |
| `TEKMEMO_RUNTIME` | `local`, `cloud`, `hybrid`, or `memory`. |
