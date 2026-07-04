# `@tekmemo/mcp-server`

<p align="center">
  <a href="https://www.npmjs.com/package/@tekmemo/mcp-server"><img src="https://img.shields.io/npm/v/%40tekmemo%2Fmcp-server?label=%40tekmemo%2Fmcp-server&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@tekmemo/mcp-server"><img src="https://img.shields.io/npm/dm/%40tekmemo%2Fmcp-server?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memo.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Model Context Protocol server for TekMemo agent integrations.

## What is this?

The `@tekmemo/mcp-server` package allows AI coding agents (like Claude Desktop, Cursor, Zed, and OpenCode) to securely read, search, and update project memory using the Model Context Protocol (MCP). It wraps the core runtime and exposes 40+ standardized tools for memory operations, cloud syncing, graph search, and AgentFS sandboxing.

## Installation

```bash
npm install -D @tekmemo/mcp-server
```

Or use directly via `npx` in your client's configuration:

```bash
npx -y @tekmemo/mcp-server --help
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
 "@tekmemo/mcp-server",
 "--runtime", "local",
 "--root", "/absolute/path/to/project"
 ]
 }
 }
}
```

## Configuration and Usage

The server supports advanced runtime modes (`local`, `cloud`, `hybrid`, `memory`), customizable read/write policies, and a strict `--read-only` flag to block mutating tools when used with untrusted clients.

For comprehensive setup instructions across all major AI tools, the full list of exposed tools and resources, and runtime mode options, please refer to the [Full Documentation](https://docs.memo.tekbreed.com/packages/mcp/).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
