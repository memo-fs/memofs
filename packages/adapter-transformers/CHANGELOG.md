# @memofs/adapter-transformers

## Unreleased

### Minor Changes

- Switched the default local embedding model from `Xenova/all-MiniLM-L6-v2` to `Xenova/bge-small-en-v1.5` (same 384 dimensions, stronger retrieval quality).
- Switched the adapter's default ONNX `dtype` from `fp32` to `q8`: the first-run model download drops from ~86 MB to ~32 MB with faster CPU inference and negligible retrieval-quality loss. `fp32` remains available via the `dtype` option.
- Added asymmetric instruction-prefix support for instruction-tuned model families (`bge`, `e5`, `nomic`).
- Model weights now live in one shared user-level cache — `$XDG_CACHE_HOME/memofs/models`, falling back to `~/.cache/memofs/models` — resolved by the adapter automatically via the new exported `resolveModelCacheDir()`. One download per machine, shared across projects and runtimes.

## 1.3.0-beta.3

### Patch Changes

- Updated internal dependencies.

## 1.3.0-beta.2

### Patch Changes

- Updated internal dependencies.

## 1.3.0-beta.1

### Patch Changes

- Updated internal dependencies.

## 1.2.0-beta.3

### Patch Changes

- Updated internal dependencies.

## 1.2.0-beta.2

### Patch Changes

- Updated internal dependencies.

## 1.2.0-beta.1

### Patch Changes

- Updated internal dependencies.

## 1.1.0-beta.1

### Patch Changes

- Updated internal dependencies.

## 1.0.0-beta.2

### Minor Changes

- Local embeddings adapter via Transformers.js (ONNX runtime) — zero API key or external cloud service required.
