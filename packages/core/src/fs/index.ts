/**
 * Worker-safe memory-store barrel.
 *
 * Only the runtime-agnostic surfaces live here: `RemoteBlobMemoryStore`
 * (content-addressed blobs over any `BlobClient` — R2 in the cloud, S3 for a
 * self-hoster), the in-memory store, and the error/option types. These import
 * only core types, so importing this barrel — and therefore the root
 * `@tekmemo/core` barrel — never pulls `node:fs`/`node:path` at module-eval
 * time. The `tekmemo-server` runtime Worker loads this surface
 * unconditionally.
 *
 * The Node.js `fs`-backed store (`NodeFsMemoryStore` + its `node:fs`/`node:path`
 * utils) is **Node-only** and lives behind the dedicated
 * `@tekmemo/core/node-fs` subpath export. It is deliberately NOT re-exported
 * here so the Worker bundle never evaluates `node:fs`. Node consumers (the CLI,
 * the MCP server) import it explicitly.
 */

// --- Worker-safe (eager) -------------------------------------------------
export * from "./errors/fs-memory-store-error";
export * from "./remote-blob-memory-store";
export * from "./types/options";
