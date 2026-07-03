# WF-7 — Review + refactor remaining packages (adapters + supporting)

`wayfinder:task` · status: open · claimed: no · blocked-by: WF-6 (core sets the pattern)

## Question

Apply the same **code-reviewer + security-reviewer + 500-LoC** pass from WF-6 to
every remaining package, reusing the pattern established on core:

- `@tekmemo/adapter-cloudflare` (the WF-1 result — R2 + D1)
- `@tekmemo/adapter-{ai-sdk,openai,transformers,voyage,workers-ai}`
- `@tekmemo/json-rpc`, `@tekmemo/connectors`, `@tekmemo/server`, `@tekmemo/mcp-server`
- `@tekmemo/benchmark-kit`, `@tekmemo/testing`
- `tekmemo` (the CLI distribution package — `packages/tekmemo`)

Known 500-LoC violation outside core: `packages/mcp-server/src/http/index.ts`
(538 lines). The CLI's `packages/tekmemo/src/runner.ts` is 965 lines — split it
into `+commands/` orchestration modules. Otherwise packages are mostly clean;
focus review on: provider-coupling leaks (adapters must keep Cloudflare types
out of any non-cloudflare package), secret/API-key handling in adapters, and the
JSON-RPC + MCP protocol surfaces for input validation.

If a package is large enough to need its own session, split this ticket before
claiming — but most adapters are small and can be reviewed as a batch.

## Definition of done
Every package passes code-reviewer + security-reviewer; no file > 500 LoC;
`validate:workspace` green.

## Blocks
WF-8 (docs document reviewed code), WF-9 (version baseline on clean code).
