# `@tekmemo/graph`

Graph memory contracts and local graph behavior.

## Install

```bash
pnpm add @tekmemo/graph
```

## Concepts

- nodes represent concepts, files, decisions, systems, people, or APIs
- edges represent relationships
- source references preserve where graph facts came from
- neighborhoods and paths help tools answer relationship questions

## Cloud and MCP

Cloud graph calls go through `@tekmemo/cloud-client`. MCP graph tools expose graph behavior through the selected runtime.
