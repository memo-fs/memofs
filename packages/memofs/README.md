# `memofs`

<p align="center">
  <a href="https://www.npmjs.com/package/memofs"><img src="https://img.shields.io/npm/v/memofs?label=memofs&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/memofs"><img src="https://img.shields.io/npm/dm/memofs?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/christophersesugh/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memo.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Memo FS command-line interface for local and cloud memory workflows.

## What is this?

The `memofs` package gives you a command-line tool for managing local, cloud, and hybrid memory. You can use it to initialize a memory workspace, store durable decisions, search past memory, and interact with the Memo FS Cloud API.

## Installation

```bash
npm install -D memofs
```

Or use directly without installing:

```bash
npx memofs --help
```

## Quick Start

Initialize memory in your project and store a durable decision:

```bash
# Initialize a memory workspace in the current directory
npx memofs init

# Store a durable decision
npx memofs remember "Use VoyageAI for embeddings" --kind decision

# Get context for a task
npx memofs context --query "current task" --json

# Inspect the current memory state
npx memofs inspect
```

## Configuration and Usage

The CLI supports Local (default), Cloud, and Hybrid runtime modes.

You can configure defaults using a ``.memofs/`config.json` file. For a complete list of commands, global flags, and cloud integration features, please refer to the [Full Documentation](https://docs.memo.memofs.dev/cli/).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
