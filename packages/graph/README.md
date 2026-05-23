# `@tekmemo/graph`

<p align="center">
  <a href="https://www.npmjs.com/package/@tekmemo/graph"><img src="https://img.shields.io/npm/v/@tekmemo%2Fgraph?label=@tekmemo/graph&style=for-the-badge" alt="npm version" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp; 
  <a href="https://www.npmjs.com/package/@tekmemo/graph"><img src="https://img.shields.io/npm/dm/@tekmemo%2Fgraph?style=for-the-badge" alt="npm downloads" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp; 
  <a href="https://docs.memo.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp; 
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

## Purpose

**Graph memory.** Provider-neutral graph-memory contracts, nodes, edges, relationship traversal, and local/in-memory graph behavior.

## Install

```bash
npm install @tekmemo/graph
```

## Quick start

```ts
import { createGraphNode, createGraphEdge } from "@tekmemo/graph";

const auth = createGraphNode({ id: "auth", label: "Authentication" });
const edge = createGraphEdge({ from: "auth", to: "billing", type: "depends_on" });
```

## Boundary

This package owns its package-level contract only. It does not own TekMemo Cloud billing, dashboards, tenancy, hosted database storage, or provider secrets unless explicitly stated by its package name.

For hosted memory, use `@tekmemo/cloud-client`. For local file-backed memory, use `tekmemo` with `@tekmemo/fs`. For MCP tools, use `@tekmemo/mcp-server`.

## License

MIT.
