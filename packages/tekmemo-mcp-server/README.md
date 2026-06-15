# @tekbreed/tekmemo-mcp-server

Model Context Protocol (MCP) server for TekMemo — expose agent memory as MCP tools.

## Installation

```bash
npm install @tekbreed/tekmemo-mcp-server
```

Or use directly without installing:

```bash
npx @tekbreed/tekmemo-mcp-server --help
```

## Usage

Run as a stdio MCP server (the standard integration pattern for coding agents):

```bash
npx tekmemo-mcp --dir /path/to/memory
```

### Claude Desktop / Cursor config

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["tekmemo-mcp", "--dir", "/path/to/memory"]
    }
  }
}
```

### Runtime modes

| Flag | Values | Default |
|------|--------|---------|
| `--mode` | `local`, `memory`, `cloud`, `hybrid` | `local` |
| `--dir` | path to memory directory | `./memory` |

## Documentation

Full documentation at [oss.tekbreed.com/tekmemo-mcp-server](https://oss.tekbreed.com/tekmemo-mcp-server).

## License

MIT
