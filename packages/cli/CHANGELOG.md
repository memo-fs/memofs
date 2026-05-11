# @tekmemo/cli

## 0.1.0

Initial release.

- Production-grade CLI for TekMemo local and cloud memory management
- Local commands: `init`, `inspect`, `read`, `edit`, `remember`, `recall`, `diff`, `snapshot`, `validate`, `doctor`
- Cloud commands: health, read, write, recall, sync, context compose, graph operations, extraction, benchmarks, exports, snapshots, providers
- Agent session commands: `agent start`, `agent paths`, `agent extract`, `agent complete`
- Runtime modes: local, cloud, hybrid via `--runtime` flag
- JSON output mode with `--json` flag
- Buffered output with color support and `--no-color` option