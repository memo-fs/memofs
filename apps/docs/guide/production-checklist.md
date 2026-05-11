# Production checklist

Use this checklist before depending on TekMemo in production.

## Local package usage

- Run `tekmemo validate` in CI.
- Avoid committing secrets to `.tekmemo/`.
- Use snapshots before large automated refactors.
- Use stable package versions.

## Cloud usage

- Use `@tekmemo/cloud-client` for all Cloud API calls.
- Store API keys in server-side secrets only.
- Scope API keys to the minimum required permissions.
- Handle typed cloud errors.
- Set request timeouts.

## Agent usage

- Ask agents to read context before planning.
- Ask agents to store only durable decisions.
- Use MCP read-only mode for untrusted clients.
- Require approval for write tools.

## Documentation ownership

Keep product marketing, pricing, billing, legal, blog, changelog, and public comparison content in the cloud app CMS. Keep developer package documentation in this VitePress app.
