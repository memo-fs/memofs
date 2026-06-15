# MCP security

MCP tools can mutate memory, so treat writes as privileged.

## Read-only mode

The server supports a global `readOnly` option that blocks all write tools.

```ts
const server = createTekMemoMcpProtocolServer({
  runtime,
  readOnly: true, // Blocks all write tools
});
```

From the CLI:

```bash
# Block all write tools
tekmemo-mcp --read-only

# Allow write tools (default)
tekmemo-mcp --allow-writes
```

Set the `TEKMEMO_MCP_READ_ONLY` environment variable to `true` to enable read-only mode without CLI flags.

## Authorization callback

The `authorize` callback lets you control which operations each client can perform. It is called before every tool execution.

```ts
import { createTekMemoMcpProtocolServer } from "@tekbreed/tekmemo-mcp-server";

const server = createTekMemoMcpProtocolServer({
  runtime,
  authorize: async (context) => {
    if (context.safety === "read") return true;
    return await userApprovedWrite();
  },
});
```

### `AuthorizationContext`

| Field | Type | Description |
| --- | --- | --- |
| `operation` | string | The tool or operation name (e.g. `"tekmemo.remember"`) |
| `safety` | `"read"` / `"write"` | Safety classification of the operation |
| `workspaceId` | string | Optional workspace ID from the request |
| `arguments` | unknown | Raw tool arguments |

When `authorize` returns `false`, the server returns an authorization error and the operation is not executed.

## Redact callback

The `redact` callback lets you sanitize sensitive values before they appear in tool responses or resource output.

```ts
const server = createTekMemoMcpProtocolServer({
  runtime,
  redact: (value, context) => {
    if (typeof value === "string" && value.startsWith("sk-")) {
      return "sk-...redacted";
    }
    return value;
  },
});
```

### `RedactContext`

| Field | Type | Description |
| --- | --- | --- |
| `operation` | string | The operation that produced the value |

## Recommendations

- Use `readOnly: true` for untrusted clients.
- Require explicit approval for write operations in the `authorize` callback.
- Apply `redact` to filter API keys, tokens, or other secrets from responses.
- Use scoped TekMemo Cloud API keys with minimal permissions.
- Prefer local mode for repository-only context.
- Prefer cloud mode for hosted team memory.
