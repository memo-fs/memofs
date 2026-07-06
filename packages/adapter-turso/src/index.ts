/**
 * @memofs/adapter-turso — Turso/libSQL metadata adapter for TekMemo's
 * remote-blob memory store.
 *
 * Implements core's provider-neutral {@link MetadataStore} contract
 * over the cloud's existing `project_files` table: `createTursoMetadataStore`.
 * Metadata storage only — the matching Cloudflare R2 blob client lives in
 * `@memofs/adapter-r2`. The Turso/libSQL coupling lives
 * here, never in core.
 *
 * @packageDocumentation
 */

export * from "./turso-metadata-store";
