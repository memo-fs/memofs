# TekMemo Docs App

Developer documentation for the TekMemo OSS workspace.

## Scope

This VitePress app documents:

- `tekmemo`
- `@tekmemo/fs`
- `@tekmemo/agentfs`
- `@tekmemo/graph`
- `@tekmemo/cloud-client`
- `@tekmemo/cli`
- `@tekmemo/mcp-server`
- `@tekmemo/ai-sdk`
- `@tekmemo/adapters`
- recall, rerank, vector, provider, and benchmark packages
- examples and architecture

It intentionally does not contain blog, changelog, pricing, billing, legal, roadmap, or competitor pages. Those belong in the TekMemo Cloud app CMS.

## Commands

```bash
pnpm --filter @tekmemo/docs dev
pnpm --filter @tekmemo/docs build
pnpm --filter @tekmemo/docs preview
pnpm --filter @tekmemo/docs check:links
```
