# `@tekmemo/mcp-server`

Model Context Protocol server boundary for TekMemo.

## Install

```bash
pnpm add -D @tekmemo/mcp-server
```

## Run local mode

```bash
tekmemo-mcp --runtime local --root .
```

## Run cloud mode

```bash
tekmemo-mcp \
  --runtime cloud \
  --cloud-url https://memo.tekbreed.com/api/v1 \
  --api-key "$TEKMEMO_API_KEY" \
  --project-id proj_123
```

Cloud mode delegates to `@tekmemo/cloud-client`.
