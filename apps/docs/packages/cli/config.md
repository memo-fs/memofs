# Config Commands

## `memofs config get`

Prints the resolved CLI configuration (mode, project ID, workspace ID, cloud status).

```bash
memofs config get
```

## `memofs config init`

Creates `.memofs/config.json` without storing secrets.

```bash
memofs config init --runtime hybrid --cloud-url https://memofs.dev/api/v1
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-f, --force` | Overwrite existing config | `false` |
| `--runtime <mode>` | Runtime mode: `local` or `hybrid` | `local` |
| `--cloud-url <url>` | MemoFS Cloud API URL | — |
| `--workspace-id <id>` | Cloud workspace ID | — |
| `--project-id <id>` | Cloud project ID | — |
