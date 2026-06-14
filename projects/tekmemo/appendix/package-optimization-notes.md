# Optimization Notes

## Completed package line

This archive completes and hardens the first package line:

- `@tekbreed/tekmemo`
- `@tekbreed/tekmemo/fs`
- `@tekbreed/tekmemo/ai-sdk`
- `@tekbreed/tekmemo/agentfs`
- `@tekbreed/tekmemo-upstash`
- `@tekbreed/tekmemo-voyage`
- `@tekbreed/tekmemo/openai`

## Edge cases covered

### Core
- unsupported paths
- path traversal
- null-byte paths
- bootstrap without overwriting existing files
- resilient JSONL parsing
- strict JSONL parsing
- empty chunk input
- invalid chunk size/overlap
- deterministic chunk IDs
- context truncation
- simple conflict detection

### FS
- missing files return empty string
- atomic writes
- append creates parent dirs
- unsafe memory dir names blocked
- traversal blocked
- list ignores temp files
- remove is idempotent

### AI SDK
- JSON Schema-compatible `inputSchema`
- no hard dependency on AI SDK runtime
- tool factory wrapper
- invalid input rejection
- search adapter optional

### AgentFS
- missing remote file returns empty string
- fallback append when remote append is absent
- root normalization
- retry wrapper
- unsafe roots and paths blocked

### Upstash
- empty upsert no-op
- missing/invalid embedding rejection
- dimension mismatch rejection
- topK validation
- metadata filter building
- registry-required `removeBySource`
- deduplicated delete IDs

### Embedders
- empty input behavior
- batching
- response count validation
- dimension validation
- NaN/Infinity rejection
- OpenAI model-specific dimensions support
- query/document input type support for Voyage

## Not included yet

The later packages are still planning-level in your archive and should be completed after this core line is stable:

- rerank
- graph memory
- connectors
- MCP server
- CLI
- cloud sync client
- benchmark kit
- observability

Build those only after the first 7 packages pass tests.
