/**
 * @tekbreed/tekmemo-adapter-r2 — Cloudflare R2 + Turso/libSQL adapter for
 * TekMemo's remote-blob memory store.
 *
 * Implements core's provider-neutral {@link BlobClient} + {@link MetadataStore}
 * contracts (ADR 0012): `createR2BlobClient` over an R2 binding, and
 * `createTursoMetadataStore` over the cloud's existing `project_files` table.
 * The cloud's R2 + Turso coupling lives here, never in core.
 *
 * @packageDocumentation
 */

export * from "./r2-blob-client";
export * from "./turso-metadata-store";
