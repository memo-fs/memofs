# `@memofs/mcp-server` API

The `@memofs/mcp-server` package implements standard stdio transport servers following the Model Context Protocol (MCP) spec.

## Classes

### `MemofsMcpServer`
The main class initializing the stdio JSON-RPC transport and registering tools.

#### Constructor

```ts
const server = new MemofsMcpServer(options: McpServerOptions);
```

#### Methods

- **`start(): Promise<void>`**: Begins listening on standard input/output streams.
- **`stop(): Promise<void>`**: Closes the connection and releases locks.
- **`registerTools(tools: ToolDefinition[]): void`**: Registers custom tools.
