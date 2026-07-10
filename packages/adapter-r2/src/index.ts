/**
 * @memofs/adapter-r2 — Cloudflare R2 blob adapter for MemoFS's remote-blob
 * memory store.
 *
 * Implements core's provider-neutral {@link BlobClient} contract:
 * `createR2BlobClient` over an R2 binding. Blob storage only — the matching
 * Turso/libSQL metadata store lives in `@memofs/adapter-turso`
 * decoupling, not a bundled N×M adapter). The Cloudflare R2 coupling lives
 * here, never in core.
 *
 * @packageDocumentation
 */

export * from "./r2-blob-client";
