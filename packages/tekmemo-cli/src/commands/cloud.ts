/**
 * CLI command handlers for interacting with the TekMemo Cloud service.
 *
 * @module cloud
 */

import type {
	CreateNoteInput,
	JsonObject,
	MemoryKind,
	RecallFallbackMode,
	RecallIndexMode,
	RecallStrategy,
	SyncConflictResolution,
	SyncEventInput,
	TekMemoCloudClient,
} from "@tekbreed/tekmemo";
import { CliUsageError } from "../errors/cli-errors";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { resolveCommandContent } from "../utils/content";
import { parseMetadataJson } from "../utils/metadata";
import { parseConfidence } from "../utils/numbers";
import { scanForSecrets } from "../utils/secrets";

/**
 * Base options shared by all cloud commands.
 */
export interface CloudCommandBaseOptions {
	/**
	 * Pre-instantiated TekMemo Cloud client from memo.cloud.
	 */
	client: TekMemoCloudClient;
	/**
	 * The CLI output console wrapper.
	 */
	output: CliOutput;
	/**
	 * If true, outputs results in structured JSON format.
	 */
	json?: boolean | undefined;
	/**
	 * Optional local workspace root directory path.
	 */
	rootDir?: string | undefined;
	/**
	 * Optional prefetched stdin content, if available.
	 */
	stdinContent?: string | undefined;
}

/**
 * Options for the cloud health command.
 */
export interface CloudHealthCommandOptions extends CloudCommandBaseOptions {}

/**
 * Options for the cloud context command.
 */
export interface CloudContextCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Text query to filter matching memory files on the cloud.
	 */
	query: string;
	/**
	 * Maximum number of records to return.
	 */
	limit?: string | number | undefined;
	/**
	 * Maximum bytes size allowed in the formatted context output.
	 */
	maxBytes?: string | number | undefined;
	/**
	 * If true, includes core memory in context.
	 */
	includeCore?: boolean | undefined;
	/**
	 * If true, includes notes memory in context.
	 */
	includeNotes?: boolean | undefined;
	/**
	 * If true, includes recent memory records in context.
	 */
	includeRecent?: boolean | undefined;
}

/**
 * Options for the cloud recall search command.
 */
export interface CloudRecallCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Text query to search in cloud memories.
	 */
	query: string;
	/**
	 * Maximum number of recall results to return.
	 */
	limit?: string | number | undefined;
	/**
	 * The search strategy to use: 'local', 'vector', or 'hybrid'.
	 */
	strategy?: string | undefined;
	/**
	 * Fallback mode if the primary search fails or yields no results: 'none' or 'local'.
	 */
	fallback?: string | undefined;
	/**
	 * If true, performs semantic reranking on the returned results.
	 */
	rerank?: boolean | undefined;
}

/**
 * Options for the cloud recall index command.
 */
export interface CloudRecallIndexCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * indexing mode: all, changed, core, or notes.
	 */
	mode?: string | undefined;
	/**
	 * If true, forces rebuilding the index even if no changes are detected.
	 */
	force?: boolean | undefined;
}

/**
 * Options for the cloud remember command.
 */
export interface CloudRememberCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Inline text content of the note to remember on the cloud.
	 */
	content?: string | undefined;
	/**
	 * If true, reads content to remember from stdin.
	 */
	stdin?: boolean | undefined;
	/**
	 * Workspace-relative path to a file containing content to remember.
	 */
	file?: string | undefined;
	/**
	 * The category of note (e.g. decision, preference, summary, note).
	 */
	kind?: string | undefined;
	/**
	 * Optional title header for the note.
	 */
	title?: string | undefined;
	/**
	 * Optional array of tags to associate with the note.
	 */
	tags?: string[] | undefined;
	/**
	 * Confidence score (0 to 1) representing the validity of the fact.
	 */
	confidence?: string | number | undefined;
	/**
	 * Optional source identifier or URI.
	 */
	source?: string | undefined;
	/**
	 * Optional metadata key-value JSON string.
	 */
	metadata?: string | undefined;
	/**
	 * If true, ignores warnings about potential secrets or API keys.
	 */
	allowSecrets?: boolean | undefined;
}

/**
 * Options for the cloud read command.
 */
export interface CloudReadCommandOptions extends CloudCommandBaseOptions {
	/**
	 * The memory type to read: 'core' or 'notes'.
	 */
	target: "core" | "notes";
	/**
	 * Maximum number of records to return.
	 */
	limit?: string | number | undefined;
}

/**
 * Options for the cloud core memory update command.
 */
export interface CloudUpdateCoreCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Inline text content to update the core memory with.
	 */
	content?: string | undefined;
	/**
	 * If true, reads content to update from stdin.
	 */
	stdin?: boolean | undefined;
	/**
	 * Workspace-relative path to a file containing content to update.
	 */
	file?: string | undefined;
	/**
	 * If true, ignores warnings about potential secrets or API keys.
	 */
	allowSecrets?: boolean | undefined;
}

/**
 * Options for the cloud recent events command.
 */
export interface CloudRecentCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Maximum number of recent events to return.
	 */
	limit?: string | number | undefined;
}

/**
 * Options for the cloud validation command.
 */
export interface CloudValidateCommandOptions extends CloudCommandBaseOptions {
	/**
	 * If true, performs strict validation on protocol files.
	 */
	strict?: boolean | undefined;
}

/**
 * Options for the cloud snapshot command.
 */
export interface CloudSnapshotCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Optional descriptive label to tag the snapshot with.
	 */
	label?: string | undefined;
	/**
	 * Optional snapshot type: 'manual', 'automatic', etc.
	 */
	type?: string | undefined;
}

/**
 * Options for the cloud sync status command.
 */
export interface CloudSyncStatusCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Unique client identifier checking status.
	 */
	clientId?: string | undefined;
}

/**
 * Options for the cloud sync pull command.
 */
export interface CloudSyncPullCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Unique client identifier pulling changes.
	 */
	clientId: string;
	/**
	 * Retrieve changes only since this server version number.
	 */
	sinceServerVersion?: string | number | undefined;
	/**
	 * Maximum number of sync events to pull.
	 */
	limit?: string | number | undefined;
}

/**
 * Options for the cloud sync push command.
 */
export interface CloudSyncPushCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Unique client identifier pushing events.
	 */
	clientId: string;
	/**
	 * Optional raw JSON string of SyncEventInput array.
	 */
	eventsJson?: string | undefined;
	/**
	 * Optional path to a file containing JSON/JSONL events to push.
	 */
	file?: string | undefined;
	/**
	 * If true, reads push events from stdin.
	 */
	stdin?: boolean | undefined;
	/**
	 * Optional checkpoint metadata JSON string.
	 */
	checkpointJson?: string | undefined;
}

/**
 * Options for the cloud sync resolve command.
 */
export interface CloudSyncResolveCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * The identifier of the conflict to resolve.
	 */
	conflictId: string;
	/**
	 * The resolution action (keep_cloud, use_client, or ignore).
	 */
	resolution: string;
}

/**
 * Options for the cloud readiness command.
 */
export interface CloudReadinessCommandOptions extends CloudCommandBaseOptions {}

/**
 * Options for the cloud context compose command.
 */
export interface CloudContextComposeCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * Text query to search.
	 */
	query: string;
	/**
	 * Maximum number of context snippets to compose.
	 */
	topK?: string | number | undefined;
	/**
	 * Search strategy: local, vector, hybrid.
	 */
	strategy?: string | undefined;
	/**
	 * If true, runs reranker.
	 */
	rerank?: boolean | undefined;
	/**
	 * If true, includes core memory.
	 */
	includeCoreMemory?: boolean | undefined;
	/**
	 * If true, includes recall results.
	 */
	includeRecallResults?: boolean | undefined;
	/**
	 * If true, includes graph context.
	 */
	includeGraphContext?: boolean | undefined;
}

/**
 * Options for listing graph nodes.
 */
export interface CloudGraphListNodesCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * Maximum number of nodes to return.
	 */
	limit?: string | number | undefined;
	/**
	 * Pagination cursor token.
	 */
	cursor?: string | undefined;
	/**
	 * Filter by node status (active, stale, deleted).
	 */
	status?: string | undefined;
}

/**
 * Options for creating a graph node.
 */
export interface CloudGraphCreateNodeCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * Unique identifier of the node.
	 */
	nodeId: string;
	/**
	 * Type classification of the node.
	 */
	type: string;
	/**
	 * Descriptive label for the node.
	 */
	label: string;
	/**
	 * Optional summary description.
	 */
	summary?: string | undefined;
	/**
	 * Optional alias names.
	 */
	aliases?: string[] | undefined;
	/**
	 * Optional JSON string of metadata key-value pairs.
	 */
	metadataJson?: string | undefined;
}

/**
 * Options for listing graph edges.
 */
export interface CloudGraphListEdgesCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * Maximum number of edges to return.
	 */
	limit?: string | number | undefined;
	/**
	 * Pagination cursor token.
	 */
	cursor?: string | undefined;
	/**
	 * Filter by edge status (active, stale, deleted).
	 */
	status?: string | undefined;
}

/**
 * Options for creating a graph edge.
 */
export interface CloudGraphCreateEdgeCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * Optional custom identifier for the edge.
	 */
	edgeId?: string | undefined;
	/**
	 * Source node identifier.
	 */
	fromNodeId: string;
	/**
	 * Target node identifier.
	 */
	toNodeId: string;
	/**
	 * Relationship type of the edge.
	 */
	type: string;
	/**
	 * If true, indicates the relationship is directed.
	 */
	directed?: boolean | undefined;
	/**
	 * Connection strength weight.
	 */
	weight?: string | number | undefined;
	/**
	 * Optional JSON string of metadata key-value pairs.
	 */
	metadataJson?: string | undefined;
}

/**
 * Options for retrieving node neighbors.
 */
export interface CloudGraphNeighborsCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * The center node identifier.
	 */
	nodeId: string;
	/**
	 * Traversal direction: in, out, both.
	 */
	direction?: string | undefined;
	/**
	 * Maximum traversal hop depth.
	 */
	depth?: string | number | undefined;
	/**
	 * Maximum neighbors to return.
	 */
	limit?: string | number | undefined;
}

/**
 * Options for finding a path between two nodes.
 */
export interface CloudGraphPathCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Starting node identifier.
	 */
	fromNodeId: string;
	/**
	 * Ending node identifier.
	 */
	toNodeId: string;
	/**
	 * Maximum traversal depth limit.
	 */
	maxDepth?: string | number | undefined;
}

/**
 * Options for running extraction jobs.
 */
export interface CloudExtractionRunCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * Extraction mode: entity, relationship, all.
	 */
	mode?: string | undefined;
	/**
	 * If true, forces rerun of extraction.
	 */
	force?: boolean | undefined;
}

/**
 * Options for listing extraction jobs.
 */
export interface CloudExtractionJobsCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * Maximum number of jobs to return.
	 */
	limit?: string | number | undefined;
}

/**
 * Options for running evaluations.
 */
export interface CloudEvalsRunCommandOptions extends CloudCommandBaseOptions {
	/**
	 * Optional comma-separated fixture identifiers to filter evaluation.
	 */
	fixtureIds?: string | undefined;
	/**
	 * Number of evaluation iterations.
	 */
	iterations?: string | number | undefined;
	/**
	 * Optional JSON string of metric evaluation thresholds.
	 */
	thresholdsJson?: string | undefined;
}

/**
 * Options for running benchmarks.
 */
export interface CloudBenchmarksRunCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * Optional comma-separated fixture identifiers to filter benchmark.
	 */
	fixtureIds?: string | undefined;
	/**
	 * Number of benchmark iterations.
	 */
	iterations?: string | number | undefined;
	/**
	 * Optional JSON string of metric benchmark thresholds.
	 */
	thresholdsJson?: string | undefined;
}

/**
 * Options for creating database exports.
 */
export interface CloudExportsCreateCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * Optional descriptive label to tag the export with.
	 */
	label?: string | undefined;
}

/**
 * Options for downloading database exports.
 */
export interface CloudExportsDownloadCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * The identifier of the export to download.
	 */
	exportId: string;
}

/**
 * Options for creating cloud snapshots.
 */
export interface CloudSnapshotsCreateCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * Optional descriptive label.
	 */
	label?: string | undefined;
	/**
	 * Optional trigger descriptor (manual, auto, pre-sync).
	 */
	trigger?: string | undefined;
}

/**
 * Options for downloading cloud snapshots.
 */
export interface CloudSnapshotsDownloadCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * The identifier of the snapshot to download.
	 */
	snapshotId: string;
}

/**
 * Options for listing cloud LLM providers.
 */
export interface CloudProvidersListCommandOptions
	extends CloudCommandBaseOptions {}

/**
 * Options for registering a cloud provider credential.
 */
export interface CloudProvidersCreateCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * Provider name (openai, anthropic, google, etc.).
	 */
	provider: string;
	/**
	 * Unique key/credential profile label.
	 */
	keyName: string;
	/**
	 * API secret key string.
	 */
	secret: string;
	/**
	 * Optional base REST endpoint URL overrides.
	 */
	restUrl?: string | undefined;
	/**
	 * Default embedding model to use.
	 */
	embeddingModel?: string | undefined;
	/**
	 * Default rerank model to use.
	 */
	rerankModel?: string | undefined;
}

/**
 * Options for testing provider credentials.
 */
export interface CloudProvidersTestCommandOptions
	extends CloudCommandBaseOptions {
	/**
	 * The credential identifier profile to test.
	 */
	credentialId: string;
}

const MEMORY_KINDS = new Set<MemoryKind>([
	"decision",
	"constraint",
	"goal",
	"preference",
	"reference",
	"summary",
	"note",
]);

const RECALL_STRATEGIES = new Set<RecallStrategy>([
	"local",
	"vector",
	"hybrid",
]);
const RECALL_FALLBACKS = new Set<RecallFallbackMode>(["none", "local"]);
const INDEX_MODES = new Set<RecallIndexMode>([
	"all",
	"changed",
	"core",
	"notes",
]);
const _CONFLICT_RESOLUTIONS = new Set<SyncConflictResolution>([
	"keep_cloud",
	"use_client",
	"ignore",
]);

/**
 * Performs a cloud health check.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudHealthCommand(
	options: CloudHealthCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.health();
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.health", result);
		return 0;
	}
	options.output.write(
		[
			"TekMemo Cloud",
			`ok: ${result.ok}`,
			`name: ${result.name ?? "unknown"}`,
			`version: ${result.version ?? "unknown"}`,
			`capabilities: ${(result.capabilities ?? []).join(", ") || "none"}`,
			...(result.warnings?.length
				? result.warnings.map((warning) => `warning: ${warning}`)
				: []),
		].join("\n"),
	);
	return result.ok ? 0 : 1;
}

/**
 * Aggregates cloud context memory files.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudContextCommand(
	options: CloudContextCommandOptions,
): Promise<number> {
	const client = options.client;
	const topK = normalizeOptionalPositiveInteger(options.limit, "limit");
	const maxBytes = normalizeOptionalPositiveInteger(
		options.maxBytes,
		"max bytes",
	);
	const includeCore = options.includeCore !== false;
	const includeNotes = options.includeNotes !== false;
	const includeRecent = options.includeRecent !== false;

	const sections: string[] = [];
	const data: Record<string, unknown> = {
		query: options.query,
		sections: [] as unknown[],
	};

	if (includeCore) {
		const core = await client.memory.readCore();
		sections.push(`# Core Memory\n\n${core.content.trim()}`);
		(data.sections as unknown[]).push({ type: "core", content: core.content });
	}

	if (includeNotes || includeRecent) {
		const notes = await client.memory.listNotes({ limit: topK ?? 10 });
		const renderedNotes = notes.items.map(renderNote).join("\n\n");
		sections.push(`# Notes\n\n${renderedNotes || "No cloud notes found."}`);
		(data.sections as unknown[]).push({
			type: "notes",
			items: notes.items,
			nextCursor: notes.nextCursor,
		});
	}

	const recall = await client.recall.query({
		query: options.query,
		...(topK !== undefined ? { topK } : {}),
		strategy: "hybrid",
		fallback: "local",
		rerank: true,
	});
	sections.push(`# Recall\n\n${renderRecallHits(recall.items)}`);
	(data.sections as unknown[]).push({ type: "recall", result: recall });

	const text = truncateText(
		sections.filter(Boolean).join("\n\n---\n\n"),
		maxBytes,
	);
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.context", {
			...data,
			text,
			truncated: maxBytes !== undefined && text.length >= maxBytes,
		});
		return 0;
	}
	options.output.write(text.trimEnd());
	return 0;
}

/**
 * Queries the cloud memory service using semantic search strategies.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudRecallCommand(
	options: CloudRecallCommandOptions,
): Promise<number> {
	const client = options.client;
	const topK = normalizeOptionalPositiveInteger(options.limit, "limit");
	const strategy = normalizeRecallStrategy(options.strategy);
	const fallback = normalizeRecallFallback(options.fallback);
	const result = await client.recall.query({
		query: options.query,
		...(topK !== undefined ? { topK } : {}),
		...(strategy !== undefined ? { strategy } : {}),
		...(fallback !== undefined ? { fallback } : {}),
		...(options.rerank !== undefined ? { rerank: options.rerank } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.recall", result);
		return 0;
	}
	options.output.write(renderRecallHits(result.items));
	return 0;
}

/**
 * Triggers a recall reindexing process on the cloud memory store.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudRecallIndexCommand(
	options: CloudRecallIndexCommandOptions,
): Promise<number> {
	const client = options.client;
	const mode = normalizeIndexMode(options.mode);
	const result = await client.recall.index({
		...(mode !== undefined ? { mode } : {}),
		...(options.force !== undefined ? { force: options.force } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.recall.index", result);
		return 0;
	}
	options.output.success(
		`Recall indexing ${result.status}${result.jobId ? ` job=${result.jobId}` : ""}`,
	);
	if (result.indexed !== undefined)
		options.output.write(`indexed: ${result.indexed}`);
	for (const warning of result.warnings ?? [])
		options.output.warn(`warning: ${warning}`);
	return 0;
}

/**
 * Stores a fact/note in the cloud memory service.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudRememberCommand(
	options: CloudRememberCommandOptions,
): Promise<number> {
	const client = options.client;
	const content = await resolveCommandContent({
		rootDir: options.rootDir ?? process.cwd(),
		inline: options.content,
		stdin: options.stdin,
		file: options.file,
		stdinContent: options.stdinContent,
	});
	const findings = scanForSecrets(content);
	if (findings.length > 0 && !options.allowSecrets) {
		const data = { stored: false, secretFindings: findings };
		if (options.json) printJsonEnvelope(options.output, "cloud.remember", data);
		else
			options.output.error(
				`Refusing to store possible secret (${findings[0]?.kind}). Use --allow-secrets only after review.`,
			);
		return 1;
	}

	const metadata = parseMetadataJson(options.metadata);
	const kind = normalizeMemoryKind(options.kind);
	const note: CreateNoteInput = {
		content,
		kind,
		...(options.title ? { title: options.title } : {}),
		...(options.tags?.length
			? { tags: options.tags.map((tag) => tag.trim()).filter(Boolean) }
			: {}),
		...(options.source ? { source: options.source } : {}),
		...(options.confidence !== undefined
			? { confidence: normalizeConfidence(options.confidence) }
			: {}),
		...(metadata ? { metadata: metadata as JsonObject } : {}),
	};
	const result = await client.memory.createNote(note);

	if (options.json) {
		printJsonEnvelope(options.output, "cloud.remember", {
			...result,
			secretFindings: findings,
		});
		return 0;
	}
	options.output.success(`Stored cloud memory ${result.id}`);
	return 0;
}

/**
 * Reads core or note memory records from the cloud.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudReadCommand(
	options: CloudReadCommandOptions,
): Promise<number> {
	const client = options.client;
	if (options.target === "core") {
		const result = await client.memory.readCore();
		if (options.json)
			printJsonEnvelope(options.output, "cloud.read", {
				target: "core",
				...result,
			});
		else options.output.write(result.content.trimEnd());
		return 0;
	}
	const limit = normalizeOptionalPositiveInteger(options.limit, "limit");
	const result = await client.memory.listNotes({
		...(limit !== undefined ? { limit } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.read", {
			target: "notes",
			...result,
		});
		return 0;
	}
	options.output.write(
		result.items.map(renderNote).join("\n\n") || "No cloud notes found.",
	);
	return 0;
}

/**
 * Updates cloud core memory contents.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudUpdateCoreCommand(
	options: CloudUpdateCoreCommandOptions,
): Promise<number> {
	const client = options.client;
	const content = await resolveCommandContent({
		rootDir: options.rootDir ?? process.cwd(),
		inline: options.content,
		stdin: options.stdin,
		file: options.file,
		stdinContent: options.stdinContent,
	});
	const findings = scanForSecrets(content);
	if (findings.length > 0 && !options.allowSecrets) {
		const data = { updated: false, secretFindings: findings };
		if (options.json)
			printJsonEnvelope(options.output, "cloud.update-core", data);
		else
			options.output.error(
				`Refusing to store possible secret (${findings[0]?.kind}). Use --allow-secrets only after review.`,
			);
		return 1;
	}
	const result = await client.memory.updateCore({ content });
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.update-core", {
			...result,
			secretFindings: findings,
		});
		return 0;
	}
	options.output.success("Updated cloud core memory.");
	return 0;
}

/**
 * Retrieves the most recent cloud memory notes.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudRecentCommand(
	options: CloudRecentCommandOptions,
): Promise<number> {
	return runCloudReadCommand({ ...options, target: "notes" });
}

/**
 * Validates the cloud memory service health and core schema compliance.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudValidateCommand(
	options: CloudValidateCommandOptions,
): Promise<number> {
	const client = options.client;
	const errors: string[] = [];
	const warnings: string[] = [];
	let healthOk = false;
	try {
		const health = await client.health();
		healthOk = health.ok;
		for (const warning of health.warnings ?? []) warnings.push(warning);
		if (!health.ok) errors.push("Cloud health check returned ok=false.");
	} catch (error) {
		errors.push(
			`health: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	try {
		await client.memory.readCore();
	} catch (error) {
		errors.push(
			`memory/core: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	if (options.strict) {
		try {
			await client.memory.listNotes({ limit: 1 });
		} catch (error) {
			errors.push(
				`memory/notes: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	const result = { ok: healthOk && errors.length === 0, warnings, errors };
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.validate", result);
		return result.ok ? 0 : 1;
	}
	if (result.ok) options.output.success("Cloud memory is valid.");
	else options.output.error("Cloud memory validation failed.");
	for (const warning of warnings) options.output.warn(`warning: ${warning}`);
	for (const error of errors) options.output.error(`error: ${error}`);
	return result.ok ? 0 : 1;
}

/**
 * Creates a cloud database snapshot.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSnapshotCommand(
	options: CloudSnapshotCommandOptions,
): Promise<number> {
	const data = {
		created: false,
		reason: "cloud_snapshots_not_available",
		message:
			"Cloud snapshots/exports are planned for the R2 milestone and are not exposed by the current project-scoped Cloud API.",
		label: options.label ?? "manual",
		type: options.type ?? "manual",
	};
	if (options.json) printJsonEnvelope(options.output, "cloud.snapshot", data);
	else options.output.error(data.message);
	return 2;
}

/**
 * Retrieves the sync status of a cloud workspace.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSyncStatusCommand(
	options: CloudSyncStatusCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.sync.status({
		...(options.clientId ? { clientId: options.clientId } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.sync.status", result);
		return 0;
	}
	options.output.write(
		[
			`serverVersion: ${result.serverVersion}`,
			`openConflicts: ${result.openConflicts}`,
			`clients: ${result.clients.length}`,
			...(result.recentEvents !== undefined
				? [`recentEvents: ${result.recentEvents}`]
				: []),
		].join("\n"),
	);
	return 0;
}

/**
 * Pulls sync events from the cloud memory service.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSyncPullCommand(
	options: CloudSyncPullCommandOptions,
): Promise<number> {
	const client = options.client;
	const sinceServerVersion = normalizeOptionalNonNegativeInteger(
		options.sinceServerVersion,
		"since server version",
	);
	const limit = normalizeOptionalPositiveInteger(options.limit, "limit");
	const result = await client.sync.pull({
		clientId: options.clientId,
		...(sinceServerVersion !== undefined ? { sinceServerVersion } : {}),
		...(limit !== undefined ? { limit } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.sync.pull", result);
		return 0;
	}
	options.output.write(
		`Pulled ${result.events.length} event(s). serverVersion=${result.serverVersion}`,
	);
	return 0;
}

/**
 * Pushes local memory events to the cloud sync service.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSyncPushCommand(
	options: CloudSyncPushCommandOptions,
): Promise<number> {
	const client = options.client;
	const payload = await resolveJsonPayload({
		rootDir: options.rootDir ?? process.cwd(),
		inline: options.eventsJson,
		stdin: options.stdin,
		file: options.file,
		stdinContent: options.stdinContent,
		fieldName: "events JSON",
	});
	const events = extractSyncEvents(payload);
	const checkpoint = options.checkpointJson
		? parseJsonObject(options.checkpointJson, "checkpoint JSON")
		: extractCheckpoint(payload);
	const result = await client.sync.push({
		clientId: options.clientId,
		events,
		...(checkpoint !== undefined ? { checkpoint } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.sync.push", result);
		return 0;
	}
	options.output.write(
		[
			`accepted: ${result.accepted.length}`,
			`duplicates: ${result.duplicates.length}`,
			`rejected: ${result.rejected.length}`,
			`conflicts: ${result.conflicts.length}`,
			`serverVersion: ${result.serverVersion}`,
		].join("\n"),
	);
	return result.rejected.length === 0 && result.conflicts.length === 0 ? 0 : 1;
}

/**
 * Resolves a sync conflict in the cloud memory service.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSyncResolveCommand(
	options: CloudSyncResolveCommandOptions,
): Promise<number> {
	const client = options.client;
	const resolution = normalizeConflictResolution(options.resolution);
	const result = await client.conflicts.resolve({
		conflictId: options.conflictId,
		resolution,
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.sync.resolve", result);
		return 0;
	}
	options.output.write(`Resolved conflict ${options.conflictId}.`);
	return 0;
}

/**
 * Performs a cloud readiness check.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudReadinessCommand(
	options: CloudReadinessCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.readiness();
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.readiness", result);
		return 0;
	}
	options.output.write(
		[
			`ok: ${result.ok}`,
			`name: ${result.name ?? "unknown"}`,
			`version: ${result.version ?? "unknown"}`,
			`capabilities: ${(result.capabilities ?? []).join(", ") || "none"}`,
			...(result.warnings?.length
				? result.warnings.map((warning) => `warning: ${warning}`)
				: []),
		].join("\n"),
	);
	return result.ok ? 0 : 1;
}

/**
 * Composes detailed context summaries from cloud memories.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudContextComposeCommand(
	options: CloudContextComposeCommandOptions,
): Promise<number> {
	const client = options.client;
	const topK = normalizeOptionalPositiveInteger(options.topK, "topK");
	const result = await client.context.compose({
		query: options.query,
		...(topK !== undefined ? { topK } : {}),
		...(options.strategy !== undefined
			? { strategy: options.strategy as "auto" | "vector" | "local" }
			: {}),
		...(options.rerank !== undefined ? { rerank: options.rerank } : {}),
		...(options.includeCoreMemory !== undefined
			? { includeCoreMemory: options.includeCoreMemory }
			: {}),
		...(options.includeRecallResults !== undefined
			? { includeRecallResults: options.includeRecallResults }
			: {}),
		...(options.includeGraphContext !== undefined
			? { includeGraphContext: options.includeGraphContext }
			: {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.context.compose", result);
		return 0;
	}
	options.output.write(result.context);
	return 0;
}

/**
 * Lists nodes in the cloud knowledge graph.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudGraphListNodesCommand(
	options: CloudGraphListNodesCommandOptions,
): Promise<number> {
	const client = options.client;
	const limit = normalizeOptionalPositiveInteger(options.limit, "limit");
	const result = await client.graph.listNodes({
		...(limit !== undefined ? { limit } : {}),
		...(options.cursor ? { cursor: options.cursor } : {}),
		...(options.status
			? {
					status: options.status as
						| "active"
						| "deprecated"
						| "conflicted"
						| "deleted",
				}
			: {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.graph.list-nodes", result);
		return 0;
	}
	options.output.write(
		result.items
			.map((node) => `Node: ${node.nodeId} - ${node.label}`)
			.join("\n") || "No nodes found.",
	);
	return 0;
}

/**
 * Creates a node in the cloud knowledge graph.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudGraphCreateNodeCommand(
	options: CloudGraphCreateNodeCommandOptions,
): Promise<number> {
	const client = options.client;
	const metadata = options.metadataJson
		? parseJsonObject(options.metadataJson, "metadata JSON")
		: undefined;
	const result = await client.graph.createNode({
		nodeId: options.nodeId,
		type: options.type,
		label: options.label,
		...(options.summary ? { summary: options.summary } : {}),
		...(options.aliases ? { aliases: options.aliases } : {}),
		...(metadata ? { metadata } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.graph.create-node", result);
		return 0;
	}
	options.output.success(`Created node ${result.nodeId}`);
	return 0;
}

/**
 * Lists edges in the cloud knowledge graph.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudGraphListEdgesCommand(
	options: CloudGraphListEdgesCommandOptions,
): Promise<number> {
	const client = options.client;
	const limit = normalizeOptionalPositiveInteger(options.limit, "limit");
	const result = await client.graph.listEdges({
		...(limit !== undefined ? { limit } : {}),
		...(options.cursor ? { cursor: options.cursor } : {}),
		...(options.status
			? {
					status: options.status as
						| "active"
						| "deprecated"
						| "conflicted"
						| "deleted",
				}
			: {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.graph.list-edges", result);
		return 0;
	}
	options.output.write(
		result.items
			.map(
				(edge) =>
					`Edge: ${edge.edgeId ?? "(new)"} - ${edge.fromNodeId} -> ${edge.toNodeId}`,
			)
			.join("\n") || "No edges found.",
	);
	return 0;
}

/**
 * Creates an edge in the cloud knowledge graph.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudGraphCreateEdgeCommand(
	options: CloudGraphCreateEdgeCommandOptions,
): Promise<number> {
	const client = options.client;
	const metadata = options.metadataJson
		? parseJsonObject(options.metadataJson, "metadata JSON")
		: undefined;
	const weight =
		options.weight !== undefined
			? parseFloat(String(options.weight))
			: undefined;
	const result = await client.graph.createEdge({
		...(options.edgeId ? { edgeId: options.edgeId } : {}),
		fromNodeId: options.fromNodeId,
		toNodeId: options.toNodeId,
		type: options.type,
		...(options.directed !== undefined ? { directed: options.directed } : {}),
		...(weight !== undefined ? { weight } : {}),
		...(metadata ? { metadata } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.graph.create-edge", result);
		return 0;
	}
	options.output.success(`Created edge ${result.edgeId ?? "(new)"}`);
	return 0;
}

/**
 * Retrieves direct and indirect neighbors of a node in the cloud knowledge graph.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudGraphNeighborsCommand(
	options: CloudGraphNeighborsCommandOptions,
): Promise<number> {
	const client = options.client;
	const depth =
		options.depth !== undefined
			? parseInt(String(options.depth), 10)
			: undefined;
	const limit = normalizeOptionalPositiveInteger(options.limit, "limit");
	const result = await client.graph.neighbors({
		nodeId: options.nodeId,
		...(options.direction
			? { direction: options.direction as "in" | "out" | "both" }
			: {}),
		...(depth !== undefined ? { depth } : {}),
		...(limit !== undefined ? { limit } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.graph.neighbors", result);
		return 0;
	}
	options.output.write(
		`Nodes: ${result.nodes.length}, Edges: ${result.edges.length}`,
	);
	return 0;
}

/**
 * Finds a path between two nodes in the cloud knowledge graph.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudGraphPathCommand(
	options: CloudGraphPathCommandOptions,
): Promise<number> {
	const client = options.client;
	const maxDepth =
		options.maxDepth !== undefined
			? parseInt(String(options.maxDepth), 10)
			: undefined;
	const result = await client.graph.path({
		fromNodeId: options.fromNodeId,
		toNodeId: options.toNodeId,
		...(maxDepth !== undefined ? { maxDepth } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.graph.path", result);
		return 0;
	}
	options.output.write(
		`Nodes: ${result.nodes.length}, Edges: ${result.edges.length}`,
	);
	return 0;
}

/**
 * Triggers a new extraction run on the cloud database.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudExtractionRunCommand(
	options: CloudExtractionRunCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.extraction.run({
		...(options.mode
			? {
					mode: options.mode as
						| "full"
						| "core"
						| "notes"
						| "sync"
						| "connectors",
				}
			: {}),
		...(options.force !== undefined ? { force: options.force } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.extraction.run", result);
		return 0;
	}
	options.output.success(
		`Extraction ${result.status}${result.jobId ? ` job=${result.jobId}` : ""}`,
	);
	return 0;
}

/**
 * Lists details on cloud extraction jobs.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudExtractionJobsCommand(
	options: CloudExtractionJobsCommandOptions,
): Promise<number> {
	const client = options.client;
	const limit = normalizeOptionalPositiveInteger(options.limit, "limit");
	const result = await client.extraction.jobs({
		...(limit !== undefined ? { limit } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.extraction.jobs", result);
		return 0;
	}
	options.output.write(
		result.items.map((job) => `Job: ${job.jobId} - ${job.status}`).join("\n") ||
			"No jobs found.",
	);
	return 0;
}

/**
 * Runs evaluations on cloud memory systems using test fixtures.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudEvalsRunCommand(
	options: CloudEvalsRunCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.evals.run({
		...(options.fixtureIds
			? { fixtureIds: options.fixtureIds.split(",").map((s) => s.trim()) }
			: {}),
		...(options.iterations !== undefined
			? { iterations: parseInt(String(options.iterations), 10) }
			: {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.evals.run", result);
		return 0;
	}
	options.output.success(`Eval pass rate: ${result.passRate}`);
	return 0;
}

/**
 * Runs latency and quality benchmarks on the cloud memory endpoints.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudBenchmarksRunCommand(
	options: CloudBenchmarksRunCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.benchmarks.run({
		...(options.fixtureIds
			? { fixtureIds: options.fixtureIds.split(",").map((s) => s.trim()) }
			: {}),
		...(options.iterations !== undefined
			? { iterations: parseInt(String(options.iterations), 10) }
			: {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.benchmarks.run", result);
		return 0;
	}
	options.output.success(
		`Benchmark pass rate: ${result.passRate}, avg latency: ${result.avgLatencyMs ?? "N/A"}ms`,
	);
	return 0;
}

/**
 * Creates a new export archive of the cloud database.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudExportsCreateCommand(
	options: CloudExportsCreateCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.exports.create({
		...(options.label ? { label: options.label } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.exports.create", result);
		return 0;
	}
	options.output.success(`Created export ${result.exportId}`);
	return 0;
}

/**
 * Resolves a download URL for a completed database export archive.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudExportsDownloadCommand(
	options: CloudExportsDownloadCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.exports.downloadUrl({
		exportId: options.exportId,
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.exports.download", result);
		return 0;
	}
	options.output.write(`Download URL: ${result.downloadUrl}`);
	return 0;
}

/**
 * Creates a new snapshot on the cloud database.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSnapshotsCreateCommand(
	options: CloudSnapshotsCreateCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.snapshots.create({
		...(options.label ? { label: options.label } : {}),
		...(options.trigger
			? { trigger: options.trigger as "manual" | "sync" | "system" }
			: {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.snapshots.create", result);
		return 0;
	}
	options.output.success(`Created snapshot ${result.snapshotId}`);
	return 0;
}

/**
 * Resolves a download URL for a completed cloud snapshot.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudSnapshotsDownloadCommand(
	options: CloudSnapshotsDownloadCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.snapshots.downloadUrl({
		snapshotId: options.snapshotId,
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.snapshots.download", result);
		return 0;
	}
	options.output.write(`Download URL: ${result.downloadUrl}`);
	return 0;
}

/**
 * Lists registered LLM provider credentials in the cloud service.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudProvidersListCommand(
	options: CloudProvidersListCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.providers.list();
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.providers.list", result);
		return 0;
	}
	options.output.write(
		result
			.map((cred) => `Provider: ${cred.provider} - ${cred.keyName}`)
			.join("\n") || "No providers found.",
	);
	return 0;
}

/**
 * Registers new LLM provider credentials in the cloud service.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudProvidersCreateCommand(
	options: CloudProvidersCreateCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.providers.create({
		provider: options.provider as "voyageai" | "openai" | "upstash-vector",
		keyName: options.keyName,
		secret: options.secret,
		...(options.restUrl ? { restUrl: options.restUrl } : {}),
		...(options.embeddingModel
			? { embeddingModel: options.embeddingModel }
			: {}),
		...(options.rerankModel ? { rerankModel: options.rerankModel } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.providers.create", result);
		return 0;
	}
	options.output.success(`Created provider credential ${result.credentialId}`);
	return 0;
}

/**
 * Tests a registered LLM provider credential's validity.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runCloudProvidersTestCommand(
	options: CloudProvidersTestCommandOptions,
): Promise<number> {
	const client = options.client;
	const result = await client.providers.test({
		credentialId: options.credentialId,
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.providers.test", result);
		return 0;
	}
	options.output.write(
		`Test result: ${result.ok ? "OK" : "Failed"}${result.message ? ` - ${result.message}` : ""}`,
	);
	return result.ok ? 0 : 1;
}

/**
 * Normalizes and validates notes kind string.
 *
 * @param value - The input note kind string.
 * @returns The validated MemoryKind.
 * @throws {CliUsageError} If the kind is invalid.
 */
function normalizeMemoryKind(value: string | undefined): MemoryKind {
	const candidate = value ?? "note";
	if (!MEMORY_KINDS.has(candidate as MemoryKind)) {
		throw new CliUsageError(
			`kind must be one of: ${[...MEMORY_KINDS].join(", ")}.`,
		);
	}
	return candidate as MemoryKind;
}

/**
 * Normalizes and validates recall strategy parameter.
 *
 * @param value - The input strategy string.
 * @returns Validated RecallStrategy or undefined.
 * @throws {CliUsageError} If the strategy is invalid.
 */
function normalizeRecallStrategy(
	value: string | undefined,
): RecallStrategy | undefined {
	if (value === undefined) return undefined;
	if (RECALL_STRATEGIES.has(value as RecallStrategy))
		return value as RecallStrategy;
	throw new CliUsageError("recall strategy must be local, vector, or hybrid.");
}

/**
 * Normalizes and validates recall fallback mode.
 *
 * @param value - The input fallback mode string.
 * @returns Validated RecallFallbackMode or undefined.
 * @throws {CliUsageError} If the fallback mode is invalid.
 */
function normalizeRecallFallback(
	value: string | undefined,
): RecallFallbackMode | undefined {
	if (value === undefined) return undefined;
	if (RECALL_FALLBACKS.has(value as RecallFallbackMode))
		return value as RecallFallbackMode;
	throw new CliUsageError("recall fallback must be none or local.");
}

/**
 * Normalizes and validates index mode selection.
 *
 * @param value - The index mode candidate.
 * @returns Validated RecallIndexMode or undefined.
 * @throws {CliUsageError} If the mode is invalid.
 */
function normalizeIndexMode(
	value: string | undefined,
): RecallIndexMode | undefined {
	if (value === undefined) return undefined;
	if (INDEX_MODES.has(value as RecallIndexMode))
		return value as RecallIndexMode;
	throw new CliUsageError("index mode must be all, changed, core, or notes.");
}

/**
 * Normalizes local conflict resolution commands to server-recognized codes.
 *
 * @param value - Local resolution option.
 * @returns Server conflict resolution action.
 * @throws {CliUsageError} If the option is invalid.
 */
function normalizeConflictResolution(
	value: string,
): "keep_existing" | "use_incoming" | "merge" | "dismiss" {
	switch (value) {
		case "keep_cloud":
			return "keep_existing";
		case "use_client":
			return "use_incoming";
		case "ignore":
			return "dismiss";
		default:
			throw new CliUsageError(
				"conflict resolution must be keep_cloud, use_client, or ignore.",
			);
	}
}

/**
 * Normalizes and parses the confidence score.
 *
 * @param value - Score candidate.
 * @returns Parsed confidence score number.
 */
function normalizeConfidence(value: string | number): number {
	return parseConfidence(String(value));
}

/**
 * Validates and normalizes optional positive integer parameters.
 *
 * @param value - Number candidate.
 * @param name - Parameter name (for errors).
 * @returns Parsed positive integer or undefined.
 * @throws {CliUsageError} If parsing fails or value is negative.
 */
function normalizeOptionalPositiveInteger(
	value: string | number | undefined,
	name: string,
): number | undefined {
	if (value === undefined) return undefined;
	const parsed = typeof value === "number" ? value : Number(value);
	if (!Number.isInteger(parsed) || parsed < 1) {
		throw new CliUsageError(`${name} must be a positive integer.`);
	}
	return parsed;
}

/**
 * Validates and normalizes optional non-negative integer parameters.
 *
 * @param value - Number candidate.
 * @param name - Parameter name.
 * @returns Parsed non-negative integer or undefined.
 * @throws {CliUsageError} If parsing fails or value is negative.
 */
function normalizeOptionalNonNegativeInteger(
	value: string | number | undefined,
	name: string,
): number | undefined {
	if (value === undefined) return undefined;
	const parsed = typeof value === "number" ? value : Number(value);
	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new CliUsageError(`${name} must be a non-negative integer.`);
	}
	return parsed;
}

/**
 * Formats a note object into standard Markdown structure.
 *
 * @param note - Stored cloud note.
 * @returns Formatted Markdown string.
 */
function renderNote(note: {
	id: string;
	kind: string;
	title?: string;
	content: string;
	tags?: string[];
	createdAt?: string;
}): string {
	const heading = note.title ? `${note.title} (${note.id})` : note.id;
	const tags = note.tags?.length ? `\n- tags: ${note.tags.join(", ")}` : "";
	const created = note.createdAt ? `\n- createdAt: ${note.createdAt}` : "";
	return `## ${heading}\n- kind: ${note.kind}${created}${tags}\n\n${note.content.trim()}`;
}

/**
 * Renders a list of search hits into user-friendly text blocks.
 *
 * @param items - Recall hits.
 * @returns Text listing hits.
 */
function renderRecallHits(
	items: Array<{ text: string; score?: number }>,
): string {
	if (items.length === 0) return "No matching cloud memories found.";
	return items
		.map((item, index) => {
			const score = item.score === undefined ? "" : ` score=${item.score}`;
			return `${index + 1}. ${item.text}${score}`;
		})
		.join("\n\n");
}

/**
 * Truncates text content to a maximum size in bytes, appending a truncation message.
 *
 * @param text - The string content.
 * @param maxBytes - Maximum byte limit.
 * @returns The potentially truncated string.
 */
function truncateText(text: string, maxBytes: number | undefined): string {
	if (maxBytes === undefined || text.length <= maxBytes) return text;
	return `${text.slice(0, Math.max(0, maxBytes - 40)).trimEnd()}\n\n[truncated by --max-bytes]`;
}

/**
 * Resolves inline, stdin, or file arguments into parsed JSON payload.
 *
 * @param input - Setup details.
 * @returns Parsed JSON unknown payload.
 * @throws {CliUsageError} If JSON parsing fails.
 */
async function resolveJsonPayload(input: {
	rootDir: string;
	inline?: string;
	stdin?: boolean;
	file?: string;
	stdinContent?: string;
	fieldName: string;
}): Promise<unknown> {
	const raw = await resolveCommandContent({
		rootDir: input.rootDir,
		inline: input.inline,
		stdin: input.stdin,
		file: input.file,
		stdinContent: input.stdinContent,
	});
	try {
		return JSON.parse(raw) as unknown;
	} catch (error) {
		throw new CliUsageError(
			`${input.fieldName} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Parses a string into a validated JsonObject.
 *
 * @param raw - Raw JSON string.
 * @param fieldName - Parameter label.
 * @returns Parsed JsonObject.
 * @throws {CliUsageError} If parsing fails or parsed value is not an object.
 */
function parseJsonObject(raw: string, fieldName: string): JsonObject {
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!isJsonObject(parsed)) throw new Error("value must be an object");
		return parsed;
	} catch (error) {
		throw new CliUsageError(
			`${fieldName} must be a JSON object: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Extracts sync events from a parsed JSON payload array or envelope.
 *
 * @param payload - Parsed payload candidate.
 * @returns Extracted SyncEventInput array.
 * @throws {CliUsageError} If structure is invalid.
 */
function extractSyncEvents(payload: unknown): SyncEventInput[] {
	const events = Array.isArray(payload)
		? payload
		: isJsonObject(payload)
			? payload.events
			: undefined;
	if (!Array.isArray(events))
		throw new CliUsageError(
			"sync push payload must be an event array or an object with an events array.",
		);
	return events.map((event, index) => {
		if (!isJsonObject(event))
			throw new CliUsageError(
				`sync event at index ${index} must be an object.`,
			);
		return event as unknown as SyncEventInput;
	});
}

/**
 * Extracts a checkpoint descriptor from a sync push JSON payload.
 *
 * @param payload - Parsed payload candidate.
 * @returns Structured checkpoint details, or undefined.
 * @throws {CliUsageError} If checkpoint property is not an object.
 */
function extractCheckpoint(
	payload: unknown,
):
	| { localVersion?: number; serverVersion?: number; hash?: string }
	| undefined {
	if (!isJsonObject(payload) || payload.checkpoint === undefined)
		return undefined;
	if (!isJsonObject(payload.checkpoint))
		throw new CliUsageError("sync checkpoint must be an object.");
	return payload.checkpoint as {
		localVersion?: number;
		serverVersion?: number;
		hash?: string;
	};
}

/**
 * Asserts whether a value is a non-null, non-array object.
 *
 * @param value - Candidate value.
 * @returns True if value is a JsonObject.
 */
function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
