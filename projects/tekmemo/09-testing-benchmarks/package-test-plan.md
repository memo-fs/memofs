# TekMemo — Package Test and Acceptance Plan

## 1. Test philosophy

TekMemo is memory infrastructure.

That means tests must protect:

- data safety
- path safety
- deterministic behavior
- provider isolation
- adapter contracts
- local-first protocol compatibility

The local `.tekmemo/` protocol must be treated as a public contract.

---

# 2. Shared contract tests

Create:

```txt
tooling/test-utils/
```

Exports:

```txt
memory-store-contract.ts
embedder-contract.ts
recall-store-contract.ts
reranker-contract.ts
fake-clients.ts
fixtures.ts
```

---

# 3. `@tekbreed/tekmemo` core tests

Must test:

- full `.tekmemo/` bootstrap
- idempotent bootstrap
- overwrite bootstrap
- manifest validation
- canonical path constants
- unsupported path rejection
- core memory read/update
- notes read/append
- conversations append/read
- event creation/append/read
- malformed JSONL skip mode
- malformed JSONL throw mode
- chunk record creation
- chunk record append/read
- mark stale chunk
- snapshot record creation/read
- invalid timestamps
- invalid event types
- invalid memory types
- invalid chunk sizes
- deterministic hashing
- deterministic chunk IDs
- circular metadata handling

---

# 4. Memory store adapter tests

Used by:

- `@tekbreed/tekmemo/fs`
- `@tekbreed/tekmemo/agentfs`

Must test:

- read missing file
- write then read
- append JSONL
- full `.tekmemo/` bootstrap
- path traversal rejection
- null-byte rejection
- unsupported path rejection
- concurrent append where possible
- idempotent bootstrap
- atomic write behavior where possible
- symlink safety where applicable

---

# 5. Embedding adapter tests

Used by:

- `@tekbreed/tekmemo-voyage`
- `@tekbreed/tekmemo/openai`

Must test:

- empty input
- batch splitting
- dimension validation
- provider error
- response count mismatch
- malformed vector
- BYOK key injection without secret logging

---

# 6. Recall store tests

Used by:

- `@tekbreed/tekmemo-upstash`
- `@tekbreed/tekmemo-turso-vector`
- `@tekbreed/tekmemo-qdrant`
- `@tekbreed/tekmemo-pinecone`

Must test:

- empty upsert
- valid upsert
- query topK
- invalid topK
- filter preservation
- namespace/project isolation
- delete IDs
- delete by source
- provider failure
- stale chunk cleanup behavior
- chunk registry compatibility

---

# 7. Reranker tests

Used by:

- `@tekbreed/tekmemo/rerank-voyage`
- `@tekbreed/tekmemo/rerank-cohere`
- `@tekbreed/tekmemo/rerank-jina`

Must test:

- empty documents
- empty query
- topK smaller/larger than docs
- duplicate IDs
- stable score order
- metadata preserved
- provider failure
- BYOK key injection without secret logging

---

# 8. Package acceptance gate

A package is not production-ready until:

```txt
[ ] builds ESM
[ ] builds CJS
[ ] emits d.ts
[ ] typecheck passes
[ ] unit tests pass
[ ] edge-case tests pass
[ ] fake client tests pass
[ ] contract tests pass if adapter
[ ] README example works
[ ] no secret leakage
[ ] exported API is documented
[ ] package respects the `.tekmemo/` protocol where applicable
```
