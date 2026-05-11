# `@tekmemo/fs`

Filesystem adapter for local `.tekmemo/` projects.

## Install

```bash
pnpm add @tekmemo/fs
```

## Owns

- safe path resolution
- local memory file reads/writes
- JSONL storage helpers
- snapshot file helpers

## Security

The adapter should reject path traversal, null-byte paths, and unsafe memory-relative paths.
