/**
 * Worker-safe memory-store barrel.
 *
 * The runtime-agnostic error/option types for the Node.js `fs`-backed store
 * live here. These import only core types, so importing this barrel — and
 * therefore the root `@memofs/core` barrel — never pulls `node:fs`/`node:path`
 * at module-eval time. The `memofs-server` runtime Worker loads this surface
 * unconditionally.
 *
 * The Node.js `fs`-backed store (`NodeFsMemoryStore` + its `node:fs`/`node:path`
 * utils) is **Node-only** and lives behind the dedicated
 * `@memofs/core/node-fs` subpath export. It is deliberately NOT re-exported
 * here so the Worker bundle never evaluates `node:fs`. Node consumers (the CLI,
 * the MCP server) import it explicitly.
 *
 * `RemoteBlobMemoryStore` (content-addressed blobs over any `BlobClient` — R2
 * in the cloud, S3 for a self-hoster) lives in `core/stores/` alongside the
 * other Worker-safe store impls.
 */

// --- Worker-safe (eager) -------------------------------------------------
export * from "./errors/fs-memory-store-error";
export * from "./types/options";
