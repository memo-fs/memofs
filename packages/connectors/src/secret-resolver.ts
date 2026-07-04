/**
 * Secret resolution — the Q2 credential plane.
 *
 * Tokens never ride in the file replica. `.tekmemo/connectors.json` carries only
 * an opaque `secretRef`; the framework resolves it to a live token through an
 * injected {@link SecretResolver} at run time, holds it in memory only, and never
 * writes it to disk. The v1 dev fallback reads a separate, gitignored, non-synced
 * `.tekmemo/secrets.json`; production wires a `CloudSecretResolver` against the
 * locked `GET /v1/projects/:projectId/connectors/:connectorId/secret` endpoint
 * when the cloud app ships.
 *
 * @public
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { TEKMEMO_DIR } from "@tekmemo/core";
import { ConnectorSecretError } from "./errors";

/**
 * Resolves an opaque `secretRef` to a live credential token.
 *
 * Implementations may read from a local file (dev), a cloud endpoint (prod),
 * a vault, etc. The resolved token lives in memory only and must never be
 * written to disk or logged.
 *
 * @public
 */
export interface SecretResolver {
	/**
	 * @param secretRef the opaque ref from a connector's config row
	 * @returns the resolved token
	 * @throws {ConnectorSecretError} if the ref cannot be resolved
	 */
	resolve(secretRef: string): Promise<string>;
}

/**
 * Constructor options for the file-backed secret resolvers.
 *
 * @public
 */
export interface FileSecretResolverOptions {
	/**
	 * The `.tekmemo/` parent directory (same rootDir passed to Tekmemo). The
	 * secrets file lives at `${rootDir}/.tekmemo/secrets.json` — a separate,
	 * gitignored, non-synced file (NOT one of the 11 canonical sync units).
	 */
	readonly rootDir: string;
}

/** Resolve `${rootDir}/${TEKMEMO_DIR}/secrets.json` (kept out of the sync replica). */
function secretsFilePath(rootDir: string): string {
	return path.join(rootDir, TEKMEMO_DIR, "secrets.json");
}

/**
 * Dev/local fallback resolver: reads a map of `{ secretRef: token }` from
 * `.tekmemo/secrets.json`.
 *
 * This file is **not** a canonical sync unit — it's a local convenience for
 * development and self-hosted setups. Add it to `.gitignore`. Production
 * deployments should inject a {@link CloudSecretResolver} against the locked
 * `GET .../connectors/:id/secret` endpoint instead.
 *
 * @public
 */
export class EnvSecretResolver implements SecretResolver {
	private readonly filePath: string;
	private cache: ReadonlyMap<string, string> | undefined;

	constructor(options: FileSecretResolverOptions) {
		this.filePath = secretsFilePath(options.rootDir);
	}

	async resolve(secretRef: string): Promise<string> {
		const map = await this.load();
		const token = map.get(secretRef);
		if (token === undefined) {
			throw new ConnectorSecretError(
				secretRef,
				`No secret found for ref "${secretRef}" in ${this.filePath}.`,
			);
		}
		return token;
	}

	private async load(): Promise<ReadonlyMap<string, string>> {
		if (this.cache) return this.cache;
		let raw: string;
		try {
			raw = await readFile(this.filePath, "utf8");
		} catch (error) {
			const code = (error as NodeJS.ErrnoException)?.code;
			if (code === "ENOENT" || code === "ENOTDIR") {
				throw new ConnectorSecretError(
					"<init>",
					`Secrets file not found at ${this.filePath}. Create it with a { "secretRef": "token" } map, or inject a different SecretResolver.`,
					{ cause: error },
				);
			}
			throw new ConnectorSecretError(
				"<init>",
				`Failed to read ${this.filePath}.`,
				{
					cause: error,
				},
			);
		}
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			throw new ConnectorSecretError(
				"<init>",
				`Secrets file is not valid JSON: ${this.filePath}.`,
				{
					cause: error,
				},
			);
		}
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			throw new ConnectorSecretError(
				"<init>",
				`Secrets file must be a JSON object of { "secretRef": "token" }.`,
			);
		}
		const map = new Map<string, string>();
		for (const [key, value] of Object.entries(
			parsed as Record<string, unknown>,
		)) {
			if (typeof value !== "string") {
				throw new ConnectorSecretError(
					key,
					`Secrets file entry "${key}" must be a string token.`,
				);
			}
			map.set(key, value);
		}
		this.cache = map;
		return map;
	}
}

/**
 * Programmatic resolver backed by an in-memory map. Intended for tests and
 * programmatic embedding where the host already holds the tokens.
 *
 * @public
 */
export class StaticSecretResolver implements SecretResolver {
	private readonly map: ReadonlyMap<string, string>;

	constructor(entries: Record<string, string>) {
		this.map = new Map(Object.entries(entries));
	}

	async resolve(secretRef: string): Promise<string> {
		const token = this.map.get(secretRef);
		if (token === undefined) {
			throw new ConnectorSecretError(
				secretRef,
				`No static secret for ref "${secretRef}".`,
			);
		}
		return token;
	}
}
