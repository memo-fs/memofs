# `@tekbreed/tekmemo-cli`

Command-line interface for TekMemo — manage your agent memory from the terminal.

## What is this?

The `@tekbreed/tekmemo-cli` package gives you a command-line tool for managing local, cloud, and hybrid memory. You can use it to initialize a memory workspace, store durable decisions, search past memory, and interact with the TekMemo Cloud API.

## Installation

```bash
npm install -D @tekbreed/tekmemo-cli
```

Or use directly without installing:

```bash
npx @tekbreed/tekmemo-cli --help
```

## Quick Start

Initialize memory in your project and store a durable decision:

```bash
# Initialize a memory workspace in the current directory
npx tekmemo init

# Store a durable decision
npx tekmemo remember "Use VoyageAI for embeddings" --kind decision

# Get context for a task
npx tekmemo context --query "current task" --json

# Inspect the current memory state
npx tekmemo inspect
```

## Configuration and Usage

The CLI supports Local (default), Cloud, and Hybrid runtime modes.

You can configure defaults using a `.tekmemo/config.json` file. For a complete list of commands, global flags, and cloud integration features, please refer to the [Full Documentation](https://oss.tekbreed.com/packages/cli/).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
