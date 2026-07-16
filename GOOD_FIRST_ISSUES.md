# Good First Issues

Welcome. 👋 MemoFS is built so that a first contribution can be small,
self-contained, and genuinely useful. Every issue below is scoped to a single
file or surface, comes with pointers to where the work lives, and needs no
prior knowledge of the whole codebase.

If you get stuck, open a draft PR early and ask — we'd rather unblock you than
have you guess. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for repository setup.

> These issues are also tracked on GitHub with the
> [`good first issue`](https://github.com/memo-fs/memofs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
> label. If an issue below isn't on GitHub yet, it's queued and will appear soon.

---

## Open issues

### [#4 — Add a zero-API-key local example](https://github.com/memo-fs/memofs/issues/4)

The README Quick Start promises "no API keys, no cloud", but every example under
[`examples/`](./examples) needs a provider key. Add a self-contained
`@memofs/core` example that writes a note, reads core memory, and runs offline
lexical recall — no embedder, no key. **Single new file + a README paragraph.**

### [#5 — Test `chunkText()` empty / whitespace-only input](https://github.com/memo-fs/memofs/issues/5)

`chunkText()` returns `[]` for whitespace-only input
([`chunk-text.ts`](./packages/core/src/core/chunking/chunk-text.ts)), but no
test covers that branch. Add a case to
[`source-and-chunking.test.ts`](./packages/core/tests/core/source-and-chunking.test.ts).
**Test-only, ~10 lines.**