# Connectors Commands

## `memofs connectors list`

Lists configured connectors from `connectors.json`.

```bash
memofs connectors list
```

## `memofs connectors add`

Adds a connector row to `.memofs/connectors.json`.

```bash
memofs connectors add --type github --secret-ref gh_token --id my-github
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--type <type>` | Connector type (`github`, `notion`, etc.) (required) | — |
| `--secret-ref <ref>` | Opaque pointer to a token stored server-side (required) | — |
| `--id <id>` | Connector ID | — |
| `--schedule <schedule>` | Schedule hint | — |
| `--source-mapping <json>` | Source-specific config as JSON | — |
| `--disabled` | Add the connector in disabled state | `false` |

## `memofs connectors remove`

Removes a connector by ID.

```bash
memofs connectors remove my-github
```

## `memofs connectors run`

Runs enabled connectors to ingest data into `.memofs/`.

```bash
memofs connectors run
memofs connectors run --type github
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--type <type>` | Run only connectors of this type | — |