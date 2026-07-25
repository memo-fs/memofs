# `@memofs/mcp-server` API

The `@memofs/mcp-server` package implements a transport-agnostic MCP protocol handler for MemoFS, plus a stdio transport runner and an adapter for embedding into an existing `@modelcontextprotocol/sdk` (or FastMCP) server. There is no server *class* to instantiate — you compose a runtime, a protocol server, and a transport.

## Composing a server

The three pieces plug together like this — this is what the package's own CLI entry point does under the hood:

```ts
import {
  createMemoFSMcpRuntimeFromConfig,
  createMemoFSMcpProtocolServer,
  runStdioServer,
} from "@memofs/mcp-server";

// 1. A runtime adapter wraps a MemoFS client — build one from config...
const runtime = createMemoFSMcpRuntimeFromConfig({ rootDir: "." });
// ...or from an existing MemoFS instance: createMemoFSMcpRuntimeFromMemoFS(memo)

// 2. The protocol server handles JSON-RPC messages against that runtime.
const server = createMemoFSMcpProtocolServer({ runtime });

// 3. A transport drives it. The stdio transport reads stdin/writes stdout
//    until the stream closes.
await runStdioServer(server);
```

`createMemoFSMcpProtocolServer` returns an object, not a class instance — there's no `.start()`/`.stop()` lifecycle on it. `runStdioServer` owns the read loop and resolves when stdin ends; there's no separate stop call because the transport's lifetime *is* the process's stdin lifetime.

## Functions

### `createMemoFSMcpRuntimeFromConfig`
Builds a `MemoFS` client from config and wraps it as a `MemoFSMcpRuntime`. This is the usual entry point.

```ts
function createMemoFSMcpRuntimeFromConfig(
  options?: RuntimeFactoryOptions
): MemoFSMcpRuntime;
```

### `createMemoFSMcpRuntimeFromMemoFS`
Wraps an already-constructed `MemoFS` instance as a `MemoFSMcpRuntime`, for when you're managing the client yourself (e.g. it's shared with other code in your process).

```ts
function createMemoFSMcpRuntimeFromMemoFS(memo: MemoFS): MemoFSMcpRuntime;
```

### `createMemoFSMcpProtocolServer`
Creates the protocol handler. Requires a `runtime` (from either factory above).

```ts
function createMemoFSMcpProtocolServer(
  options: MemoFSMcpOptions
): MemoFSMcpProtocolServer;
```

### `runStdioServer`
Runs a protocol server over stdio: reads newline-delimited JSON-RPC from stdin, writes responses to stdout, logs fatal per-line errors to stderr. Resolves when stdin closes.

```ts
function runStdioServer(server: MemoFSMcpProtocolServer): Promise<void>;
```

### `registerMemoFSMcpCapabilities`
Alternative to the built-in stdio transport: registers MemoFS's tools, resources, and prompts directly onto an existing `@modelcontextprotocol/sdk` or FastMCP server instance, so you don't run a separate MemoFS process at all. Structural typing — no compile-time dependency on the SDK package.

```ts
function registerMemoFSMcpCapabilities(
  server: StructuralMcpServer,
  options: MemoFSMcpOptions
): void;
```

---

## Interfaces

### `MemoFSMcpOptions`
Configuration for the protocol server and the SDK-embedding adapter.

- `runtime: MemoFSMcpRuntime` — required
- `name?: string`
- `version?: string`
- `instructions?: string`
- `readOnly?: boolean` — same switch as the CLI's `--read-only` / `MEMOFS_MCP_READ_ONLY`
- `defaultPageSize?: number` — default `25`
- `maxPageSize?: number` — default `100`
- `requestTimeoutMs?: number` — same as CLI `--request-timeout-ms`
- `maxInputBytes?: number` — same as CLI `--max-input-bytes`
- `maxOutputBytes?: number` — same as CLI `--max-output-bytes`
- `authorize?: (context: AuthorizationContext) => Promise<boolean> | boolean`
- `redact?: (args: unknown) => unknown`

### `MemoFSMcpProtocolServer`
Returned by `createMemoFSMcpProtocolServer`. Transport-agnostic — feed it messages, get responses back.

- `readonly options` — the normalized options above
- `handleJsonRpcMessage(message: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>` — accepts a single request or a batch array; returns `undefined` for notifications
- `handleJsonRpcText(text: string): Promise<string | undefined>` — parses a raw string payload first; what `runStdioServer` calls per line

### `MemoFSMcpRuntime`
The adapter the protocol server calls into — produced by either runtime factory above. Its methods mirror `MemoFS`'s own client methods (`context`, `recall`, `writeMemory`, `validate`, `consolidate`, the AgentFS session methods, graph methods, sync methods, etc.) one-to-one; see the [`@memofs/core` API](/api/core) for what each does. You won't normally implement this yourself — treat it as an internal seam between the protocol layer and the client.

### `RuntimeFactoryOptions`
Options for `createMemoFSMcpRuntimeFromConfig`.

- `mode?: MemoFSRuntimeMode` — `"local"` or `"hybrid"`
- `rootDir?: string`
- `projectId?: string`
- `workspaceId?: string`
- `store?: MemoryStore` — inject a custom store (e.g. `InMemoryMemoryStore` for tests); defaults to a `NodeFsMemoryStore` built from `rootDir`
- `cloudClient?: MemoFsConfig["cloudClient"]`
- `cloud?: { baseUrl?, apiKey?, workspaceId?, projectId?, timeoutMs?, userAgent?, requireApiKey?, retry? }`
- `recall?: MemoFsConfig["recall"]` — set `recall.localEmbeddings: false` to skip lazy-loading the local ONNX embedder and keep the runtime lexical-only

### `StructuralMcpServer`
The minimal shape `registerMemoFSMcpCapabilities` needs from a host SDK server — every member is optional, and whichever ones exist get used:

- `registerTool?(name, config, handler)`
- `tool?(name, description, schema, handler)` — newer FastMCP-style signature
- `registerResource?(name, uriOrTemplate, config, handler)`
- `registerPrompt?(name, config, handler)`
- `prompt?(name, description, schema, handler)` — newer FastMCP-style signature

---

## Errors

All extend `MemoFSMcpError`, which carries `.code` (stable string), `.status` (an HTTP-equivalent code, for hosts that want one), and optional `.details`.

| Class | `.code` | `.status` | Thrown when |
|---|---|---|---|
| `McpValidationError` | `MCP_VALIDATION_ERROR` | 400 | A request fails schema/param validation |
| `McpAuthorizationError` | `MCP_AUTHORIZATION_ERROR` | 403 | A write tool is called without authorization (see `options.authorize`) |
| `McpNotFoundError` | `MCP_NOT_FOUND` | 404 | An unknown tool, resource, or method is requested |
| `McpTimeoutError` | `MCP_TIMEOUT` | 504 | An operation exceeds `requestTimeoutMs` |
| `McpOutputLimitError` | `MCP_OUTPUT_LIMIT` | 413 | A response exceeds `maxOutputBytes` |
| `MemoFSMcpError` | `MEMOFS_MCP_ERROR` (default) | 500 | Base class; catch this for a single handler covering all of the above |

### `toSafeError`
Normalizes any caught value (a `MemoFSMcpError`, a plain `Error`, or a non-Error throw) into `{ name, message, code, status, details? }` — what `handleJsonRpcText`/`handleJsonRpcMessage` use internally to build JSON-RPC error responses. Exported for hosts building their own error surface on top of `MemoFSMcpRuntime`.

```ts
function toSafeError(error: unknown): {
  name: string;
  message: string;
  code: string;
  status: number;
  details?: unknown;
};
```

## See Also

- [MCP Server guide](/packages/mcp/) — running this as a CLI subprocess (`npx @memofs/mcp-server`), client config snippets, and command-line flags. The `MemoFSMcpOptions` fields above are what those flags configure.
- [Hosted MCP Endpoint](/packages/mcp/hosted-mcp-endpoint) / [Hybrid Mode](/packages/mcp/hybrid-mode) — running without embedding this package directly.
- [`@memofs/core` API](/api/core) — the `MemoFS` client that `MemoFSMcpRuntime` wraps.