# MCP security

MCP tools can mutate memory, so treat writes as privileged.

## Recommendations

- Use `readOnly: true` for untrusted clients.
- Require explicit approval for write operations.
- Do not store API keys or secrets in memory.
- Use scoped TekMemo Cloud API keys.
- Prefer local mode for repository-only context.
- Prefer cloud mode for hosted team memory.

## Authorization callback

```ts
const server = createTekMemoMcpProtocolServer({
  runtime,
  authorize: async ({ safety }) => {
    if (safety === "read") return true;
    return await userApprovedWrite();
  },
});
```
