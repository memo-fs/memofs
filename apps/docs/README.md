# MemoFS Documentation Site

The MemoFS documentation site is a React Router + Fumadocs application deployed to Cloudflare Pages.

## Architecture

- `content/docs/` is the single source of truth for documentation, including the changelog. It powers the docs pages, search index, sitemap, and LLM text exports.
- `src/lib/site.ts` owns public URLs, internal route constants, and shared navigation data.
- `src/lib/meta.ts` produces consistent canonical, Open Graph, and Twitter metadata.
- `functions/subscribe.ts` is the only server-side endpoint. Everything else is prerendered into `build/client` and served statically by Cloudflare Pages.

## Development

From the repository root:

```bash
pnpm docs:dev
```

Run the type check with:

```bash
pnpm --filter @memofs/docs typecheck
```

## Build and deploy

```bash
pnpm --filter @memofs/docs build
```

Deploy `build/client` as the Cloudflare Pages output directory. Cloudflare discovers the `functions/` directory and deploys `/subscribe` as a Pages Function alongside the static output.

For local newsletter development, copy `.dev.vars.example` to `.dev.vars` and set `RESEND_API_KEY`. In Cloudflare Pages, configure `RESEND_API_KEY` as a secret; `RESEND_SEGMENT_ID` and `RESEND_FROM` are non-secret vars in `wrangler.jsonc`.
