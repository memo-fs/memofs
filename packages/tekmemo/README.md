# `tekmemo`

<p align="center">
  <a href="https://www.npmjs.com/package/tekmemo"><img src="https://img.shields.io/npm/v/tekmemo?label=tekmemo&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/tekmemo"><img src="https://img.shields.io/npm/dm/tekmemo?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memo.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

TekMemo command-line interface for local and cloud memory workflows.

## What is this?

The `tekmemo` package gives you a command-line tool for managing local, cloud, and hybrid memory. You can use it to initialize a memory workspace, store durable decisions, search past memory, and interact with the TekMemo Cloud API.

## Installation

```bash
npm install -D tekmemo
```

Or use directly without installing:

```bash
npx tekmemo --help
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

You can configure defaults using a `.tekmemo/config.json` file. For a complete list of commands, global flags, and cloud integration features, please refer to the [Full Documentation](https://docs.memo.tekbreed.com/cli/).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
