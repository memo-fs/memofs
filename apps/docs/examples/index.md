# Examples

The examples folder shows the supported ways to use TekMemo packages in real projects.

## Start here

| Goal | Example | Package |
| --- | --- | --- |
| Use local `.tekmemo/` memory | [Local only](./local-only.md) | `tekmemo`, `@tekmemo/fs` |
| Use graph memory | [Graph memory](./graph-memory.md) | `@tekmemo/graph` |
| Call TekMemo Cloud | [Cloud client](./cloud-client.md) | `@tekmemo/cloud-client` |
| Use shell/agent commands | [CLI](./cli.md) | `@tekmemo/cli` |
| Expose memory to coding agents | [MCP](./mcp.md) | `@tekmemo/mcp-server` |
| Add memory to AI SDK tools | [AI SDK](./ai-sdk.md) | `@tekmemo/adapters/ai-sdk` |

## Framework integrations

TekMemo Cloud works with any JavaScript server runtime. The pattern is the same across frameworks:

1. Install `@tekmemo/cloud-client`
2. Create the client with server-side environment variables
3. Use memory composables in route handlers, loaders, or server actions

| Framework | Environment | Key constraint |
| --- | --- | --- |
| Next.js | Route handlers, server actions | Never expose `TEKMEMO_API_KEY` to browser bundles |
| React Router | Loaders, actions | Server-only exports |
| Express | Route handlers | Standard Node.js middleware |
| Hono | Route handlers | Works on Node, Deno, Bun, Cloudflare Workers |
| Fastify | Route handlers | Standard Node.js backend |
| NestJS | Services, controllers | Inject via providers |
| Cloudflare Workers | Fetch handlers | Use `env` bindings for secrets |
| Node HTTP | Server handlers | Native `node:http` |
| TanStack Router | Server functions | SSR-only execution |
| Astro | API routes, server islands | Server-side endpoints |
| SvelteKit | `+server.ts`, `+page.server.ts` | Server-only modules |
| Nuxt | `server/api/`, server routes | Nitro server handlers |
| Vite React | Backend API server | Separate backend from SPA |

## Rule for cloud examples

`TEKMEMO_API_KEY` is a server-side secret. Use it in route handlers, loaders, workers, CLI tools, MCP runtimes, and backend services. Do not put it in browser-side code.

## Validate examples

```bash
node examples/scripts/check-examples.mjs
pnpm examples:check
```
