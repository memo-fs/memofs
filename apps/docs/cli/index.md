# CLI

`@tekmemo/cli` gives developers and coding agents a safe command line for local, cloud, and hybrid memory.

## Install

```bash
pnpm add -D @tekmemo/cli
```

## Common commands

```bash
tekmemo init
tekmemo inspect
tekmemo remember "Use VoyageAI for embeddings" --kind decision
tekmemo context --query "current task" --json
tekmemo validate --root .
```

## Runtime modes

| Mode | Command shape |
| --- | --- |
| Local | `tekmemo context --query "task"` |
| Cloud | `tekmemo cloud context --query "task"` |
| Hybrid | configure with `tekmemo config init --runtime hybrid` |
