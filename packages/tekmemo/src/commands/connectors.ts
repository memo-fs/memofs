/**
 * CLI command handlers for the `tekmemo connectors` command group.
 *
 * Implements `add`, `remove`, `list`, and `run` (decision Q7). Config lives in
 * `.tekmemo/connectors.json` (the 11th canonical sync unit); tokens never ride
 * in the file — `add` accepts only an opaque `--secret-ref`, never a raw token.
 * `run` invokes the `@tekmemo/connectors` framework with the host's
 * `Tekmemo` instance (single-writer contract, AGENTS.md).
 *
 * @module commands/connectors
 */

import type { JsonObject, Tekmemo } from "@tekmemo/core";
import { CONNECTORS_PATH } from "@tekmemo/core";
import {
	type ConnectorConfig,
	ConnectorConfigError,
	ConnectorRegistry,
	type ConnectorsFile,
	EnvSecretResolver,
	type RunConnectorsResult,
	validateConnectorsFile,
} from "../../../connectors/src/types";
import { getRootDir, readTextIfExists, writeText } from "../cli/store-helpers";
import { CliUsageError, CliValidationError } from "../errors/cli-errors";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";

/**
 * Options shared by every connectors subcommand.
 */
interface ConnectorsCommandOptions {
	memo: Tekmemo;
	output: CliOutput;
	json?: boolean;
}

/**
 * `tekmemo connectors list` — list configured connectors.
 *
 * @returns CLI exit code.
 */
export async function runConnectorsListCommand(
	options: ConnectorsCommandOptions,
): Promise<number> {
	const file = await readConnectorsFile(options.memo);
	if (options.json) {
		printJsonEnvelope(options.output, "connectors.list", {
			connectors: file.connectors,
		});
		return 0;
	}

	if (file.connectors.length === 0) {
		options.output.write("No connectors configured.");
		options.output.write(
			`Add one with: tekmemo connectors add --type <type> --secret-ref <ref>`,
		);
		return 0;
	}

	const lines = ["Connectors:", ""];
	for (const c of file.connectors) {
		const state = c.enabled ? "enabled" : "disabled";
		const schedule = c.schedule ? `, schedule: ${c.schedule}` : "";
		lines.push(`- ${c.id} (${c.type}) [${state}${schedule}]`);
		lines.push(`    secretRef: ${c.secretRef}`);
		if (c.sourceMapping) {
			lines.push(`    source: ${JSON.stringify(c.sourceMapping)}`);
		}
	}
	options.output.write(lines.join("\n"));
	return 0;
}

/** Options for the `connectors add` command. */
export interface ConnectorsAddCommandOptions extends ConnectorsCommandOptions {
	type: string;
	id?: string;
	secretRef: string;
	enabled?: boolean;
	schedule?: string;
	sourceMapping?: string;
}

/**
 * `tekmemo connectors add` — add a connector row to `.tekmemo/connectors.json`.
 *
 * Accepts only an opaque `--secret-ref`, never a raw token (ADR 0002). Validates
 * the resulting file (rejects token-leak fields) and writes through the store
 * (single-writer lock).
 *
 * @returns CLI exit code.
 */
export async function runConnectorsAddCommand(
	options: ConnectorsAddCommandOptions,
): Promise<number> {
	if (!options.type || options.type.length === 0) {
		throw new CliUsageError("--type <type> is required (e.g. github, notion).");
	}
	if (!options.secretRef || options.secretRef.length === 0) {
		throw new CliUsageError(
			"--secret-ref <ref> is required. This is an opaque pointer to a token stored server-side — never the token itself (ADR 0002).",
		);
	}

	const file = await readConnectorsFile(options.memo);
	const id = options.id ?? deriveDefaultId(options.type, file);

	if (file.connectors.some((c: ConnectorConfig) => c.id === id)) {
		throw new CliValidationError(
			`A connector with id "${id}" already exists. Use a different --id or remove the existing one first.`,
		);
	}

	let sourceMapping: JsonObject | undefined;
	if (options.sourceMapping) {
		try {
			sourceMapping = JSON.parse(options.sourceMapping) as JsonObject;
		} catch (error) {
			throw new CliUsageError(
				`--sourceMapping must be valid JSON (got: "${options.sourceMapping}").`,
				{ cause: error },
			);
		}
	}

	const newConnector: ConnectorConfig = {
		id,
		type: options.type,
		enabled: options.enabled ?? true,
		secretRef: options.secretRef,
		...(options.schedule === undefined ? {} : { schedule: options.schedule }),
		...(sourceMapping === undefined ? {} : { sourceMapping }),
	};

	const next: ConnectorsFile = {
		connectors: [...file.connectors, newConnector],
	};

	// Validate the full file before writing — catches token-leak fields and
	// structural issues (validateConnectorsFile throws ConnectorConfigError).
	const validated = validateConnectorsFile({
		connectors: next.connectors,
	});

	await writeText(
		options.memo.store,
		CONNECTORS_PATH,
		`${JSON.stringify({ connectors: validated.connectors }, null, 2)}\n`,
	);

	const data = { added: newConnector, total: validated.connectors.length };
	if (options.json) {
		printJsonEnvelope(options.output, "connectors.add", data);
		return 0;
	}

	options.output.success(
		`Added connector "${id}" (type: ${options.type}). ${validated.connectors.length} connector(s) configured.`,
	);
	return 0;
}

/** Options for the `connectors remove` command. */
export interface ConnectorsRemoveCommandOptions
	extends ConnectorsCommandOptions {
	id: string;
}

/**
 * `tekmemo connectors remove` — remove a connector by id.
 *
 * @returns CLI exit code.
 */
export async function runConnectorsRemoveCommand(
	options: ConnectorsRemoveCommandOptions,
): Promise<number> {
	if (!options.id || options.id.length === 0) {
		throw new CliUsageError(
			"--id <id> (or the connector id argument) is required.",
		);
	}

	const file = await readConnectorsFile(options.memo);
	const remaining = file.connectors.filter(
		(c: ConnectorConfig) => c.id !== options.id,
	);

	if (remaining.length === file.connectors.length) {
		throw new CliValidationError(`No connector with id "${options.id}" found.`);
	}

	await writeText(
		options.memo.store,
		CONNECTORS_PATH,
		`${JSON.stringify({ connectors: remaining }, null, 2)}\n`,
	);

	if (options.json) {
		printJsonEnvelope(options.output, "connectors.remove", {
			removed: options.id,
			remaining: remaining.length,
		});
		return 0;
	}

	options.output.success(
		`Removed connector "${options.id}". ${remaining.length} connector(s) remaining.`,
	);
	return 0;
}

/** Options for the `connectors run` command. */
export interface ConnectorsRunCommandOptions extends ConnectorsCommandOptions {
	onlyType?: string;
	registry?: ConnectorRegistry;
}

/**
 * `tekmemo connectors run` — run enabled connectors, ingesting into `.tekmemo/`.
 *
 * Uses the host's `Tekmemo` instance (single-writer contract — the runner never
 * constructs its own). Resolves secrets via `EnvSecretResolver` (reads the
 * gitignored `.tekmemo/secrets.json`).
 *
 * @returns CLI exit code.
 */
export async function runConnectorsRunCommand(
	options: ConnectorsRunCommandOptions,
): Promise<number> {
	const { runConnectors } = await import("../../../connectors/src/types");
	const rootDir = getRootDir(options.memo.store);
	const registry = options.registry ?? new ConnectorRegistry();

	const result: RunConnectorsResult = await runConnectors({
		rootDir,
		memo: options.memo,
		secretResolver: new EnvSecretResolver({ rootDir }),
		connectorRegistry: registry,
		...(options.onlyType === undefined ? {} : { onlyType: options.onlyType }),
	});

	if (options.json) {
		printJsonEnvelope(options.output, "connectors.run", result);
		return result.errors.length > 0 ? 1 : 0;
	}

	const lines: string[] = [];
	lines.push(`Connectors run complete.`);
	lines.push(
		`- ran: ${result.ran.length > 0 ? result.ran.join(", ") : "(none)"}`,
	);
	lines.push(`- written: ${result.written.length}`);
	lines.push(`- skipped (already ingested): ${result.skipped.length}`);
	if (result.errors.length > 0) {
		lines.push(`- errors: ${result.errors.length}`);
		for (const err of result.errors) {
			lines.push(`    [${err.connectorType}] ${err.message}`);
		}
	}
	options.output.write(lines.join("\n"));
	return result.errors.length > 0 ? 1 : 0;
}

// --- helpers ---

/** Read + validate `.tekmemo/connectors.json` through the store. */
async function readConnectorsFile(memo: Tekmemo): Promise<ConnectorsFile> {
	const raw = await readTextIfExists(memo.store, CONNECTORS_PATH);
	if (raw === undefined) {
		return { connectors: [] };
	}
	try {
		const parsed = JSON.parse(raw) as unknown;
		return validateConnectorsFile(parsed);
	} catch (error) {
		if (error instanceof ConnectorConfigError) {
			throw new CliValidationError(
				`Invalid connectors.json: ${error.message}`,
				{
					cause: error,
				},
			);
		}
		throw new CliValidationError(
			`connectors.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error },
		);
	}
}

/** Derive `<type>-<n>` when the caller doesn't pass --id. */
function deriveDefaultId(type: string, file: ConnectorsFile): string {
	const existing = new Set(file.connectors.map((c: ConnectorConfig) => c.id));
	if (!existing.has(type)) return type;
	let n = 2;
	while (existing.has(`${type}-${n}`)) n++;
	return `${type}-${n}`;
}
