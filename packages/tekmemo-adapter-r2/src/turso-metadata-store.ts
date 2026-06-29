/**
 * Turso/libSQL metadata store — implements core's provider-neutral
 * {@link MetadataStore} over the cloud's existing `project_files` table.
 *
 * Reuses the file-replica sync infra rather than inventing a parallel store
 * (ADR 0012 reuse sub-decision): the runtime's canonical `.tekmemo/` files are
 * the *same* files the replica holds. `project_files (project_id, path, sha256,
 * r2_key, size_bytes, updated_at)` — with its unique `(project_id, path)` index
 * — is the single source of truth for which paths exist and where their bytes
 * live.
 *
 * Issued as raw SQL against the libSQL client (not drizzle), so this adapter
 * stays free of the cloud's drizzle schema. The cloud passes its raw client
 * (`db.$client`, exposed by the drizzle libSQL driver) — see
 * `apps/cloud/src/db/index.server.ts`. Column names are the documented contract.
 *
 * @public
 */

import type { BlobEntry, MetadataStore } from "@tekbreed/tekmemo";
import type { Client } from "@libsql/client";

/** Column names on the `project_files` table (the documented layout contract). */
const TABLE = "project_files";

/**
 * Options for {@link createTursoMetadataStore}.
 *
 * @public
 */
export interface CreateTursoMetadataStoreOptions {
	/** The raw libSQL client (the cloud passes `db.$client`). */
	client: Client;
	/** The project id scoping this manifest (the `RemoteBlobMemoryStore.rootKey`). */
	projectId: string;
}

/**
 * Creates a {@link MetadataStore} backed by a Turso/libSQL `project_files`
 * table, scoped to one project.
 *
 * @example
 * ```ts
 * import { createTursoMetadataStore } from "@tekbreed/tekmemo-adapter-r2";
 *
 * const metadata = createTursoMetadataStore({
 *   client: db.$client,
 *   projectId,
 * });
 * ```
 *
 * @public
 */
export function createTursoMetadataStore(
	options: CreateTursoMetadataStoreOptions,
): MetadataStore {
	const { client, projectId } = options;

	return {
		async getEntry(path) {
			const rs = await client.execute({
				sql: `SELECT sha256, r2_key, size_bytes FROM ${TABLE}
				      WHERE project_id = ? AND path = ?
				      LIMIT 1`,
				args: [projectId, path],
			});
			const row = rs.rows[0];
			if (!row) return undefined;
			return toEntry(row);
		},

		async upsertEntry(path, entry) {
			// Mirror the sync handler's `commitPushTx` exactly: INSERT ... ON
			// CONFLICT (project_id, path) DO UPDATE — insert-or-replace semantics
			// on the unique index. `id` is a text PK; a fresh UUID keeps it unique
			// without importing the cloud's cuid2 factory (cross-runtime).
			await client.execute({
				sql: `INSERT INTO ${TABLE} (id, project_id, path, sha256, r2_key, size_bytes)
				      VALUES (?, ?, ?, ?, ?, ?)
				      ON CONFLICT (project_id, path) DO UPDATE SET
				        sha256 = excluded.sha256,
				        r2_key = excluded.r2_key,
				        size_bytes = excluded.size_bytes,
				        updated_at = current_timestamp`,
				args: [
					newId(),
					projectId,
					path,
					entry.sha256,
					entry.blobKey,
					entry.sizeBytes,
				],
			});
		},

		async removeEntry(path) {
			// Idempotent: deleting a missing row is a no-op.
			await client.execute({
				sql: `DELETE FROM ${TABLE}
				      WHERE project_id = ? AND path = ?`,
				args: [projectId, path],
			});
		},
	};
}

/** Maps a libSQL row to a {@link BlobEntry}. */
function toEntry(row: Record<string, unknown>): BlobEntry {
	const sha256 = String(row.sha256);
	const blobKey = String(row.r2_key);
	const sizeBytes = Number(row.size_bytes);
	return { sha256, blobKey, sizeBytes };
}

/**
 * Generates a unique id for a `project_files` row. Uses `crypto.randomUUID`
 * (cross-runtime: Node 22 + Cloudflare Workers) rather than the cloud's cuid2
 * factory, so this adapter has no dependency on the cloud's id module. The id is
 * only required to be unique; its shape is not load-bearing.
 */
function newId(): string {
	return globalThis.crypto.randomUUID();
}
