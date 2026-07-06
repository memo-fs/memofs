# `@memofs/mcp-server`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/mcp-server"><img src="https://img.shields.io/npm/v/%40memofs%2Fmcp-server?label=%40memofs%2Fmcp-server&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/mcp-server"><img src="https://img.shields.io/npm/dm/%40memofs%2Fmcp-server?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/christophersesugh/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Model Context Protocol server for Memo FS agent integrations.

## What is this?

The `@memofs/mcp-server` package allows AI coding agents (like Claude Desktop, Cursor, Zed, and OpenCode) to securely read, search, and update project memory using the Model Context Protocol (MCP). It wraps the core runtime and exposes 40+ standardized tools for memory operations, cloud syncing, graph search, and AgentFS sandboxing.

## Installation

```bash
npm install -D @memofs/mcp-server
```

Or use directly via `npx` in your client's configuration:

```bash
npx -y @memofs/mcp-server --help
```

## Quick Start

You can configure your MCP client (e.g., Claude Desktop or Cursor) to start the server via stdio.

### Claude Desktop / Cursor Config

```json
{
 "mcpServers": {
 "memofs": {
 "command": "npx",
 "args": [
 "-y",
 "@memofs/mcp-server",
 "--runtime", "local",
 "--root", "/absolute/path/to/project"
 ]
 }
 }
}
```

## Configuration and Usage

The server supports advanced runtime modes (`local`, `cloud`, `hybrid`, `memory`), customizable read/write policies, and a strict `--read-only` flag to block mutating tools when used with untrusted clients.

For comprehensive setup instructions across all major AI tools, the full list of exposed tools and resources, and runtime mode options, please refer to the [Full Documentation](https://docs.memofs.dev/packages/mcp/).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
