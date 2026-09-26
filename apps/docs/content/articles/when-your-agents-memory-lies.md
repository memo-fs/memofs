---
title: "When Your Agent's Memory Lies"
description: "High-confidence memories become silently, confidently wrong when the files or codebase they describe change underneath them. Here is how MemoFS detects and flags anchor drift in agent memory."
category: Engineering
publishedAt: "2026-08-17"
authorName: "Christopher S. Aondona"
authorRole: "Founder & Engine Lead"
authorInitials: "CSA"
authorHandle: "christophersesugh"
authorAvatarUrl: "https://github.com/christophersesugh.png"
featured: false
tags: [code-anchoring, drift-detection, staleness, recall, memory-intelligence, engineering]
---

You open your editor, spin up your AI agent, and ask it to add a new route to your API. The agent eagerly gets to work. It writes the route, wires up the middleware, and confidently tells you: *"I've used the JWT payload from `src/auth/provider.ts` to extract the tenant ID."*

There's just one problem. Last week, you ripped out JWTs and migrated the entire app to OAuth. `src/auth/provider.ts` hasn't contained a single reference to a JWT in days. 

But your agent doesn't know that. It remembers the architectural decision from a previous session, and it believes that decision is still the ground truth. It confidently gives you advice for a file that no longer matches the memory. 

This is memory rot. High-confidence memories become confidently wrong when the files they describe change underneath them.

## Why vector databases can't solve this

The standard industry answer to memory is to throw text into a vector database and retrieve it using cosine similarity. But vector databases are fundamentally disconnected from the actual files in your workspace. 

A vector store knows that the phrase "JWT payload" is semantically similar to your query about authentication. It doesn't know that `src/auth/provider.ts` exists. It doesn't know what its contents are. And it certainly doesn't know that the file was modified three days ago, invalidating the memory it's about to serve.

To solve memory rot, your memory system has to understand that workspace files exist, and it has to bind memories to the actual physical state of those files.

## The AnchorRef contract

MemoFS attacks staleness by binding memories directly to source code. We call this code anchoring. Under the hood, a memory can be annotated with an `AnchorRef`:

```typescript
export interface AnchorRef {
  /** Repository-relative file path */
  file: string;
  /** SHA-256 hex digest of the anchored file's bytes at write time */
  hash: string;
  /** Optional AST symbol path for .ts/.tsx files (e.g. src/auth.ts#verify) */
  symbol?: string;
}
```

This tiny contract anchors the context. A memory is no longer just floating text; it's a claim about a specific state of a specific file.

## Write-time anchoring: binding memory to code

How do these anchors get created? MemoFS intercepts them at write time through two paths.

First, you can pass an explicit anchor via the SDK when recording a memory:

```typescript
await memo.notes.record({
  content: "Use JWTs for session tokens.",
  kind: "decision",
  anchor: {
    file: "src/auth/provider.ts",
    hash: "a1b2c3d4...", // computed by the runtime
    symbol: "src/auth/provider.ts#verifyJwt"
  }
});
```

Second, MemoFS automatically extracts anchors from the agent's prose. If an agent includes an `@anchor` marker in its output, MemoFS parses it and validates it at write time:

```typescript
// anchor-marker.ts
const ANCHOR_MARKER_RE = /@anchor\(\s*file=([^,\s)]+)(?:\s*,\s*symbol=([^)\s]+))?\s*\)/;

export function parseAnchorMarker(content: string): ParsedAnchorMarker | undefined {
  const match = ANCHOR_MARKER_RE.exec(content);
  if (!match || match[1] === undefined) return undefined;
  return { file: match[1], symbol: match[2] };
}
```

For TypeScript files, MemoFS goes a step further. It dynamically loads the TypeScript Compiler API to walk the AST and verify that the requested symbol actually exists in the file before committing the anchor. If the agent hallucinates a class name, the symbol extraction fails gracefully.

## Query-time drift detection: the hot path

Binding a memory to a file is only half the battle. Drift detection occurs at query time, when MemoFS retrieves the memory and checks if reality has shifted.

When you query MemoFS, it runs the `applyAnchorDrift` seam over the retrieved items. For every memory that has an anchor, MemoFS resolves the file path and checks its current SHA-256 hash against the `hash` stored in the `AnchorRef`.

If the file has been modified (the hashes don't match), or if the file has been deleted entirely, MemoFS does not hide the memory. Instead, it flags it as stale:

```typescript
// anchor-drift.ts (simplified)
if (currentHash !== anchor.hash) {
  // Drift detected (hash mismatch OR file deleted)
  item.stale = true;
  item.score = (item.score ?? 1) * 0.5;
  
  // Transition the bound graph node to "stale"
  const updatedNode = { ...node, status: "stale" };
  await graphStore.upsertNodes([updatedNode]);
}
```

The memory is surfaced, but its retrieval score is halved. The agent sees the memory, but it also sees the `stale: true` flag. It knows: *"I made this decision based on a version of the code that no longer exists. I need to re-verify this before I trust it."*

## The caching layer: mtime fast-paths

Hashing files on every single recall query would be devastating to performance. MemoFS mitigates this with a fast, in-process `AnchorHashCache`.

Instead of running an expensive `fs.watch` daemon (which introduces asynchronous lifecycle nightmares and non-deterministic test behavior), MemoFS uses a synchronous `mtime` stat check as its primary invalidation gate.

```typescript
// anchor-drift.ts (simplified)
const stats = await stat(file);
if (
  cached && 
  cached.mtimeMs === stats.mtimeMs && 
  cached.size === stats.size &&
  now - cached.ts < ANCHOR_HASH_CACHE_TTL_MS
) {
  return { hash: cached.hash, fromCache: true };
}
```

If the file's modification time and size haven't changed, and the cache entry is younger than the 5-minute TTL, MemoFS skips the SHA-256 computation entirely. The cache is serialized to `.memofs/manifest.json`, meaning a fresh agent session can warm-start from the previous session's cache instantly.

## Security: preventing path traversal attacks

Whenever an agent can instruct a system to read a file, you have a potential security vulnerability. A malicious prompt could trick an agent into anchoring to `/etc/shadow`, creating a hash-confirmation oracle.

MemoFS hardens this at the resolution layer:

```typescript
// anchor-drift.ts
export function isSafeAnchorPath(file: string, rootDir: string): boolean {
  const resolved = resolve(rootDir, file);
  const rel = relative(rootDir, resolved);
  return !rel.startsWith("..") && rel !== "";
}
```

Any anchor path that attempts to escape the project root is silently dropped. This defense-in-depth runs both at write time (when parsing the marker) and at query time (in case cold-started events contain old, unsafe paths).

## Score demotion vs deletion

Why do we demote the score (`score *= 0.5`) instead of just deleting the memory?

Because amnesia is worse than staleness. If MemoFS deleted the memory, the agent would completely forget that it ever made an architectural decision about authentication. By serving the memory with a `stale` flag, the agent retains the historical context but gains the epistemic humility to know its context is degraded.

This also allows for compounding penalties. If a memory is both code-drifted (`score *= 0.5`) and time-decayed past its expiry floor (`score *= 0.6`), it suffers a compounded demotion (`score *= 0.3`). The runtime naturally suppresses facts that are old *and* factually disconnected from the current codebase.

## Limitations

There are a few current edges to the system:
1. **Lexical path checks:** The security gate (`isSafeAnchorPath`) is currently lexical. A malicious symlink inside the workspace pointing to an external file could bypass the check. Symlink defense via `fs.realpath` is planned for v1.x.
2. **TS-only AST:** The `symbol` AST extraction currently only supports `.ts` and `.tsx` files via the TypeScript Compiler API. For other languages, drift detection relies purely on file-level hashing.

## Start remembering

Agent memory shouldn't be a black box that quietly rots. It needs to be anchored and self-invalidating.

You can add MemoFS to your project right now:

```bash
npm i -g @memofs/cli
memofs init
memofs generate agent claude --project-name "My API"
```

Give your agent a memory that knows when it's wrong.

- **Core runtime:** `@memofs/core` · [docs](https://memofs.dev/packages/core/)
- **CLI:** `npx memofs` · [commands](https://memofs.dev/packages/cli/)
- **MCP server:** `npx -y @memofs/mcp-server` · [setup](https://memofs.dev/packages/mcp/)
