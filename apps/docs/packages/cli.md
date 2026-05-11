# `@tekmemo/cli`

Command-line tooling for local, cloud, and hybrid memory workflows.

## Install

```bash
pnpm add -D @tekmemo/cli
```

## Start

```bash
tekmemo init
tekmemo remember "Use D1 for tenant metadata." --kind decision
tekmemo context --query "database work" --json
```

Cloud commands delegate to `@tekmemo/cloud-client`.
