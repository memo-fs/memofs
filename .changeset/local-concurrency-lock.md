---
"@tekbreed/tekmemo": minor
---

# Local concurrency enforcement — advisory file lock (Q28)

`NodeFsMemoryStore` now enforces the local single-process contract: the first
mutating write (write/append/delete) acquires an **advisory file lock at
`.tekmemo/.lock`** and holds it process-lifetime. A second process attempting a
mutating op on the same `.tekmemo/` root gets a clear `LockHeldError`. Reads
never block.

This closes the honest limit of file-first that the Q28 industry review
flagged: two Claude Code windows on one repo is a day-one v1 scenario, and a
replace-whole-file race on `core.md` silently loses a write under the existing
in-process `PathLock` + atomic temp+rename (which only serialize *within* one
process). The advisory lock serializes *across* processes — the git-index model.

## What changed

- **New `LockHeldError`** (extends `FsMemoryStoreError`), thrown when a second
  live process holds the lock. Carries the holder PID + startedAt in `details`.
- **New `NodeFsMemoryStore` options**: `lock` (default `true`) and
  `lockMaxAgeMs` (default 1 hour). Set `lock: false` to opt out — for tests
  that deliberately share a root across stores, or when an external coordinator
  already serializes access.
- **`NodeFsMemoryStore.dispose()`**: releases the lock before process exit
  (the lock is also auto-released via a `process.on('exit')` sync handler, so
  a graceful exit frees it even without an explicit `dispose`).
- The lock file contains `{ pid, startedAt }` JSON so a stale lock left by a
  **crashed** process (SIGKILL) is detectable (PID-liveness probe via
  `kill(pid, 0)`) and reclaimable. `lockMaxAgeMs` is a PID-reuse safety net.

## What's unchanged

- **The in-process `PathLock`** still serializes same-instance concurrent
  writes to the same path (the 50-concurrent-appends test still passes). The
  advisory lock layers *on top* — it guards the whole `.tekmemo/` root across
  processes; the in-process lock guards individual files within one process.
- **`InMemoryMemoryStore`** never touches the filesystem and is unaffected
  (no lock, no-op). The `MemoryStore` interface is unchanged.
- **Reads** (`read`, `exists`) never acquire the lock — recall, the AI SDK
  adapter's context injection, and read-only consumers stay lock-free.
- **The cloud concurrency layer** (ADR 0010 / Q25b) is a *separate* mechanism:
  local serializes (a second local process is accidental); cloud serializes
  *through a DB* (multi-agent writers are the intended B3 workload).

## Why

Per Q28 (decisions.md): local is single-process by contract, but the contract
was previously unenforced — it relied on the user not opening two windows. An
advisory lock at the storage layer means every store implementation gets it for
free, and a violation is a clear, actionable error rather than a silent lost
write. Not ADR-worthy (a storage-layer convention, like D6); recorded in
`decisions.md` + `AGENTS.md`.
