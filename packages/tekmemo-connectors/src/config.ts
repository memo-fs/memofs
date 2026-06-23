/**
 * `.tekmemo/connectors.json` reader + validator.
 *
 * @public
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { CONNECTORS_PATH } from "@tekbreed/tekmemo";
import { ConnectorConfigError } from "./errors";
import type { ConnectorConfig, ConnectorsFile } from "./types";

/** Field names that would leak a raw token if present on a connector row. */
const TOKEN_LEAK_FIELDS = [
	"token",
	"secret",
	"apiKey",
	"apikey",
	"access_token",
] as const;

/** Empty default — a missing connectors file degrades gracefully (no connectors run). */
export const EMPTY_CONNECTORS_FILE: ConnectorsFile = Object.freeze({
	connectors: [],
}) as ConnectorsFile;

/**
 * Resolve the absolute path to `.tekmemo/connectors.json` for a given root.
 *
 * `rootDir` is the *parent* of `.tekmemo/` (memory paths always start with
 * `.tekmemo/`), so this is `path.join(rootDir, CONNECTORS_PATH)`.
 */
function connectorsFilePath(rootDir: string): string {
	return path.join(rootDir, CONNECTORS_PATH);
}

/**
 * Read `.tekmemo/connectors.json` from disk.
 *
 * A missing file resolves to an empty connector set (degrades gracefully — no
 * connectors run). A malformed file or an invalid row throws
 * {@link ConnectorConfigError}.
 *
 * @public
 * @param rootDir the `.tekmemo/` parent directory (same rootDir passed to Tekmemo)
 */
export async function readConnectorsFile(
	rootDir: string,
): Promise<ConnectorsFile> {
	const filePath = connectorsFilePath(rootDir);
	let raw: string;
	try {
		raw = await readFile(filePath, "utf8");
	} catch (error) {
		const code = (error as NodeJS.ErrnoException)?.code;
		if (code === "ENOENT" || code === "ENOTDIR") {
			return { connectors: [] };
		}
		throw new ConnectorConfigError(
			`Failed to read connectors file: ${filePath}`,
			{
				cause: error,
			},
		);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		throw new ConnectorConfigError(
			`Connectors file is not valid JSON: ${filePath}`,
			{
				cause: error,
			},
		);
	}

	return validateConnectorsFile(parsed);
}

/**
 * Validate a parsed `connectors.json` payload.
 *
 * Structural (zod-free) checks: top-level shape, required per-row fields, non-empty
 * `id`/`type`/`secretRef`, and rejection of any token-shaped field leak (the
 * `packages/tekmemo-cli/src/utils/secrets.ts` guardrail intent — tokens never
 * ride in the file replica).
 *
 * @public
 * @param raw the parsed JSON value
 */
export function validateConnectorsFile(raw: unknown): ConnectorsFile {
	if (!isObject(raw)) {
		throw new ConnectorConfigError(
			`Connectors file must be an object with a "connectors" array.`,
		);
	}
	const maybeArray = (raw as Record<string, unknown>).connectors;
	if (!Array.isArray(maybeArray)) {
		throw new ConnectorConfigError(
			`Connectors file "connectors" must be an array.`,
		);
	}

	const connectors: ConnectorConfig[] = maybeArray.map((entry, index) => {
		if (!isObject(entry)) {
			throw new ConnectorConfigError(
				`Connector at index ${index} is not an object.`,
			);
		}
		const row = entry as Record<string, unknown>;

		// Reject token leaks first — fail loudly before any field is read out.
		for (const leak of TOKEN_LEAK_FIELDS) {
			if (leak in row) {
				throw new ConnectorConfigError(
					`Connector at index ${index} contains a "${leak}" field — tokens must not appear in connectors.json. Use "secretRef" instead (ADR 0002).`,
				);
			}
		}

		const id = requireString(row, "id", index);
		const type = requireString(row, "type", index);
		const secretRef = requireString(row, "secretRef", index);
		if (secretRef.length === 0) {
			throw new ConnectorConfigError(
				`Connector "${id}" has an empty "secretRef" — a non-empty opaque ref is required.`,
			);
		}

		const enabled =
			row.enabled === undefined
				? true
				: parseBoolean(row.enabled, "enabled", id);
		const schedule = optionalString(row.schedule, "schedule", id);
		const sourceMapping = optionalObject(
			row.sourceMapping,
			"sourceMapping",
			id,
		);

		const config: ConnectorConfig = {
			id,
			type,
			enabled,
			...(schedule === undefined ? {} : { schedule }),
			...(sourceMapping === undefined ? {} : { sourceMapping }),
			secretRef,
		};
		return config;
	});

	return { connectors };
}

/**
 * Select a subset of connectors by `enabled` state and optional `type`.
 *
 * @public
 * @param file the parsed connectors file
 * @param opts optional filters (`enabled` defaults to `true`; `type` filters to one connector type)
 */
export function selectConnectors(
	file: ConnectorsFile,
	opts: { enabled?: boolean; type?: string } = {},
): ConnectorConfig[] {
	const wantEnabled = opts.enabled ?? true;
	return file.connectors.filter((c) => {
		if (wantEnabled && !c.enabled) return false;
		if (!wantEnabled && c.enabled) return false;
		if (opts.type !== undefined && c.type !== opts.type) return false;
		return true;
	});
}

// --- structural helpers (zod-free validation) ---

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
	row: Record<string, unknown>,
	field: string,
	index: number,
): string {
	const value = row[field];
	if (typeof value !== "string") {
		throw new ConnectorConfigError(
			`Connector at index ${index} is missing required string field "${field}".`,
		);
	}
	return value;
}

function parseBoolean(value: unknown, field: string, id: string): boolean {
	if (typeof value !== "boolean") {
		throw new ConnectorConfigError(
			`Connector "${id}" field "${field}" must be a boolean.`,
		);
	}
	return value;
}

function optionalString(
	value: unknown,
	field: string,
	id: string,
): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string") {
		throw new ConnectorConfigError(
			`Connector "${id}" field "${field}" must be a string.`,
		);
	}
	return value;
}

function optionalObject(
	value: unknown,
	field: string,
	id: string,
): import("@tekbreed/tekmemo").JsonObject | undefined {
	if (value === undefined) return undefined;
	if (!isObject(value)) {
		throw new ConnectorConfigError(
			`Connector "${id}" field "${field}" must be an object.`,
		);
	}
	return value as import("@tekbreed/tekmemo").JsonObject;
}
