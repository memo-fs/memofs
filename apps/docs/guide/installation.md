# Installation

Install only the packages you need.

## Local runtime and filesystem

```bash
pnpm add tekmemo @tekmemo/fs
```

## CLI

```bash
pnpm add -D @tekmemo/cli
```

## MCP server

```bash
pnpm add -D @tekmemo/mcp-server
```

## Cloud client

```bash
pnpm add @tekmemo/cloud-client
```

## AI SDK helpers

```bash
pnpm add @tekmemo/ai-sdk ai
# or, through the adapters convenience package
pnpm add @tekmemo/adapters ai
```

## Graph memory

```bash
pnpm add @tekmemo/graph
```

## Provider adapters

```bash
pnpm add @tekmemo/openai @tekmemo/voyageai @tekmemo/upstash-vector
# or, through the adapters convenience package
pnpm add @tekmemo/adapters openai @upstash/vector
```

## Package manager note

The workspace uses pnpm. Published packages can be consumed by pnpm, npm, Yarn, or Bun unless a package README states otherwise.
