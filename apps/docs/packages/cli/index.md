# Command Line Interface (CLI)

The `memofs` package provides the primary command-line tool for managing local, cloud, and hybrid memory workflows. 

---

## Installation

Install the CLI globally or as a development dependency in your project:

```bash
# Globally
npm install -g memofs

# As a devDependency
npm install -D memofs
```

You can also run it on demand without installation:

```bash
npx memofs --help
```

---

## CLI Commands

### `memofs init`
Initializes a new Memo FS memory workspace in the current directory, generating the `.memofs/` structure and template files.

```bash
memofs init
```

### `memofs remember`
Stores a new memory fragment or note in the workspace.

- **Usage:** `memofs remember <text> [options]`
- **Options:**
  - `--kind <type>`: The kind of memory (`decision`, `constraint`, `goal`, `preference`, `reference`, `summary`, `note`). Default: `note`.

```bash
memofs remember "Use VoyageAI for vector embeddings" --kind decision
```

### `memofs context`
Queries the memory layers using hybrid recall to generate a condensed context payload for agents.

- **Usage:** `memofs context --query <query> [options]`
- **Options:**
  - `--json`: Output as structured JSON (useful for piping into agents).

```bash
memofs context --query "deployment steps"
```

### `memofs inspect`
Displays a status dashboard of the current memory filesystem, including counts of tracked notes, local snapshots, and sync status.

```bash
memofs inspect
```

### `memofs sync`
Synchronizes local memory changes with the configured remote replica.

- **Usage:** `memofs sync [push|pull|status]`

```bash
# Push local memories
memofs sync push

# Pull remote changes
memofs sync pull
```
