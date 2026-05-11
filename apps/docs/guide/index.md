# Guide

This guide gets you from zero to a working TekMemo memory setup.

Start here if you want to understand the runtime model before choosing CLI, MCP, Cloud, or AI SDK integration.

## Recommended path

1. [Install TekMemo](./installation)
2. [Initialize local memory](./getting-started)
3. [Understand the filesystem](./filesystem-layout)
4. [Add durable records](./memory-records)
5. [Use the CLI or MCP in an agent workflow](/cli/)
6. [Connect cloud when you need sync or hosted APIs](/cloud-client/)

## Runtime choices

| Runtime | Use when |
| --- | --- |
| Local | You want inspectable project memory stored in `.tekmemo/`. |
| Cloud | You want hosted project memory, sync, API keys, recall, and graph endpoints. |
| Hybrid | You want local files plus cloud recall/sync. |
| In-memory | You are writing tests, demos, or package examples. |
