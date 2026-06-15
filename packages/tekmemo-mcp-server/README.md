# `@tekbreed/tekmemo-mcp-server`

Model Context Protocol (MCP) server for TekMemo — expose agent memory as MCP tools, resources, and prompts.

## What is this?

The `@tekbreed/tekmemo-mcp-server` package allows AI coding agents (like Claude Desktop, Cursor, Zed, and OpenCode) to securely read, search, and update project memory using the Model Context Protocol (MCP). It wraps the core runtime and exposes 40+ standardized tools for memory operations, cloud syncing, graph search, and AgentFS sandboxing.

## Installation

```bash
npm install -D @tekbreed/tekmemo-mcp-server
```

Or use directly via `npx` in your client's configuration:

```bash
npx -y @tekbreed/tekmemo-mcp-server --help
```

## Quick Start

You can configure your MCP client (e.g., Claude Desktop or Cursor) to start the server via stdio.

### Claude Desktop / Cursor Config

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": [
        "-y",
        "@tekbreed/tekmemo-mcp-server",
        "--runtime", "local",
        "--root", "/absolute/path/to/project"
      ]
    }
  }
}
```

## Configuration and Usage

The server supports advanced runtime modes (`local`, `cloud`, `hybrid`, `memory`), customizable read/write policies, and a strict `--read-only` flag to block mutating tools when used with untrusted clients.

For comprehensive setup instructions across all major AI tools, the full list of exposed tools and resources, and runtime mode options, please refer to the [Full Documentation](https://oss.tekbreed.com/packages/mcp/).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
