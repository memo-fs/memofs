# Security architecture

## Do

- Keep API keys server-side.
- Use scoped TekMemo API keys.
- Reject secrets in local memory.
- Require approval for agent writes.
- Use read-only MCP mode for untrusted clients.
- Redact provider credentials from logs and errors.

## Do not

- Put TekMemo Cloud API keys in browser bundles.
- Store private keys or tokens in `.tekmemo/`.
- Let agents write arbitrary filesystem paths.
