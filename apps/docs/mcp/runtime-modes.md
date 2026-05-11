# MCP runtime modes

| Mode | Purpose |
| --- | --- |
| `local` | Use local `.tekmemo/` through `tekmemo` and `@tekmemo/fs`. |
| `memory` | In-memory runtime for tests and examples. |
| `cloud` | Use `@tekmemo/cloud-client` and a TekMemo Cloud API key. |
| `hybrid` | Combine local files and cloud calls. |

## Hybrid policies

Supported read/write policies:

- `local-first`
- `cloud-first`
- `local-only`
- `cloud-only`

Recommended first setup:

```txt
reads: local memory + cloud recall
writes: local first, cloud second
```
