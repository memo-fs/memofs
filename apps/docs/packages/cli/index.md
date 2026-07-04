# Command Line Interface (CLI)

The `tekmemo` package provides the primary command-line tool for managing local, cloud, and hybrid memory workflows. 

---

## Installation

Install the CLI globally or as a development dependency in your project:

```bash
# Globally
npm install -g tekmemo

# As a devDependency
npm install -D tekmemo
```

You can also run it on demand without installation:

```bash
npx tekmemo --help
```

---

## CLI Commands

### `tekmemo init`
Initializes a new TekMemo memory workspace in the current directory, generating the `.tekmemo/` structure and template files.

```bash
tekmemo init
```

### `tekmemo remember`
Stores a new memory fragment or note in the workspace.

- **Usage:** `tekmemo remember <text> [options]`
- **Options:**
  - `--kind <type>`: The kind of memory (`decision`, `constraint`, `goal`, `preference`, `reference`, `summary`, `note`). Default: `note`.

```bash
tekmemo remember "Use VoyageAI for vector embeddings" --kind decision
```

### `tekmemo context`
Queries the memory layers using hybrid recall to generate a condensed context payload for agents.

- **Usage:** `tekmemo context --query <query> [options]`
- **Options:**
  - `--json`: Output as structured JSON (useful for piping into agents).

```bash
tekmemo context --query "deployment steps"
```

### `tekmemo inspect`
Displays a status dashboard of the current memory filesystem, including counts of tracked notes, local snapshots, and sync status.

```bash
tekmemo inspect
```

### `tekmemo sync`
Synchronizes local memory changes with the configured remote replica.

- **Usage:** `tekmemo sync [push|pull|status]`

```bash
# Push local memories
tekmemo sync push

# Pull remote changes
tekmemo sync pull
```
