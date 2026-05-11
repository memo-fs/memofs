# CLI cloud and hybrid mode

Cloud commands use `@tekmemo/cloud-client`. They should not manually construct Cloud API requests.

## Environment

```bash
export TEKMEMO_CLOUD_URL="https://memo.tekbreed.com/api/v1"
export TEKMEMO_API_KEY="tk_live_..."
export TEKMEMO_PROJECT_ID="proj_123"
```

## Commands

```bash
tekmemo cloud health
tekmemo cloud context --query "current task" --json
tekmemo cloud recall "billing webhooks"
tekmemo cloud remember "Use D1 for sync truth." --kind decision
tekmemo cloud sync status
```

## Hybrid

```bash
tekmemo config init --runtime hybrid --read-policy local-first --write-policy local-first
```
