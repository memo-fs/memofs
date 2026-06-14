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
import { type CloudConnectionOptions, createCliCloudClient } from "../cloud";
import { CliUsageError } from "../errors/cli-errors";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { resolveCommandContent } from "../utils/content";
import { parseMetadataJson } from "../utils/metadata";
import { parseConfidence } from "../utils/numbers";
import { scanForSecrets } from "../utils/secrets";

export interface CloudCommandBaseOptions extends CloudConnectionOptions {
	output: CliOutput;
	json?: boolean | undefined;
	rootDir?: string | undefined;
	stdinContent?: string | undefined;
}

export interface CloudHealthCommandOptions extends CloudCommandBaseOptions {}

export interface CloudContextCommandOptions extends CloudCommandBaseOptions {
	query: string;
	limit?: string | number | undefined;
	maxBytes?: string | number | undefined;
	includeCore?: boolean | undefined;
	includeNotes?: boolean | undefined;
	includeRecent?: boolean | undefined;
}

export interface CloudRecallCommandOptions extends CloudCommandBaseOptions {
	query: string;
	limit?: string | number | undefined;
	strategy?: string | undefined;
	fallback?: string | undefined;
	rerank?: boolean | undefined;
}

export interface CloudRecallIndexCommandOptions
	extends CloudCommandBaseOptions {
	mode?: string | undefined;
	force?: boolean | undefined;
}

export interface CloudRememberCommandOptions extends CloudCommandBaseOptions {
	content?: string | undefined;
	stdin?: boolean | undefined;
	file?: string | undefined;
	kind?: string | undefined;
	title?: string | undefined;
	tags?: string[] | undefined;
	confidence?: string | number | undefined;
	source?: string | undefined;
	metadata?: string | undefined;
	allowSecrets?: boolean | undefined;
}

export interface CloudReadCommandOptions extends CloudCommandBaseOptions {
	target: "core" | "notes";
	limit?: string | number | undefined;
}

export interface CloudUpdateCoreCommandOptions extends CloudCommandBaseOptions {
	content?: string | undefined;
	stdin?: boolean | undefined;
	file?: string | undefined;
	allowSecrets?: boolean | undefined;
}

export interface CloudRecentCommandOptions extends CloudCommandBaseOptions {
	limit?: string | number | undefined;
}

export interface CloudValidateCommandOptions extends CloudCommandBaseOptions {
	strict?: boolean | undefined;
}

export interface CloudSnapshotCommandOptions extends CloudCommandBaseOptions {
	label?: string | undefined;
	type?: string | undefined;
}

export interface CloudSyncStatusCommandOptions extends CloudCommandBaseOptions {
	clientId?: string | undefined;
}

export interface CloudSyncPullCommandOptions extends CloudCommandBaseOptions {
	clientId: string;
	sinceServerVersion?: string | number | undefined;
	limit?: string | number | undefined;
}

export interface CloudSyncPushCommandOptions extends CloudCommandBaseOptions {
	clientId: string;
	eventsJson?: string | undefined;
	file?: string | undefined;
	stdin?: boolean | undefined;
	checkpointJson?: string | undefined;
}

export interface CloudSyncResolveCommandOptions
	extends CloudCommandBaseOptions {
	conflictId: string;
	resolution: string;
	contentJson?: string | undefined;
}

export interface CloudReadinessCommandOptions extends CloudCommandBaseOptions {}

export interface CloudContextComposeCommandOptions
	extends CloudCommandBaseOptions {
	query: string;
	topK?: string | number | undefined;
	strategy?: string | undefined;
	rerank?: boolean | undefined;
	includeCoreMemory?: boolean | undefined;
	includeRecallResults?: boolean | undefined;
	includeGraphContext?: boolean | undefined;
}

export interface CloudGraphListNodesCommandOptions
	extends CloudCommandBaseOptions {
	limit?: string | number | undefined;
	cursor?: string | undefined;
	status?: string | undefined;
}

export interface CloudGraphCreateNodeCommandOptions
	extends CloudCommandBaseOptions {
	nodeId: string;
	type: string;
	label: string;
	summary?: string | undefined;
	aliases?: string[] | undefined;
	metadataJson?: string | undefined;
}

export interface CloudGraphListEdgesCommandOptions
	extends CloudCommandBaseOptions {
	limit?: string | number | undefined;
	cursor?: string | undefined;
	status?: string | undefined;
}

export interface CloudGraphCreateEdgeCommandOptions
	extends CloudCommandBaseOptions {
	edgeId?: string | undefined;
	fromNodeId: string;
	toNodeId: string;
	type: string;
	directed?: boolean | undefined;
	weight?: string | number | undefined;
	metadataJson?: string | undefined;
}

export interface CloudGraphNeighborsCommandOptions
	extends CloudCommandBaseOptions {
	nodeId: string;
	direction?: string | undefined;
	depth?: string | number | undefined;
	limit?: string | number | undefined;
}

export interface CloudGraphPathCommandOptions extends CloudCommandBaseOptions {
	fromNodeId: string;
	toNodeId: string;
	maxDepth?: string | number | undefined;
}

export interface CloudExtractionRunCommandOptions
	extends CloudCommandBaseOptions {
	mode?: string | undefined;
	force?: boolean | undefined;
}

export interface CloudExtractionJobsCommandOptions
	extends CloudCommandBaseOptions {
	limit?: string | number | undefined;
}

export interface CloudEvalsRunCommandOptions extends CloudCommandBaseOptions {
	fixtureIds?: string | undefined;
	iterations?: string | number | undefined;
	thresholdsJson?: string | undefined;
}

export interface CloudBenchmarksRunCommandOptions
	extends CloudCommandBaseOptions {
	fixtureIds?: string | undefined;
	iterations?: string | number | undefined;
	thresholdsJson?: string | undefined;
}

export interface CloudExportsCreateCommandOptions
	extends CloudCommandBaseOptions {
	label?: string | undefined;
}

export interface CloudExportsDownloadCommandOptions
	extends CloudCommandBaseOptions {
	exportId: string;
}

export interface CloudSnapshotsCreateCommandOptions
	extends CloudCommandBaseOptions {
	label?: string | undefined;
	trigger?: string | undefined;
}

export interface CloudSnapshotsDownloadCommandOptions
	extends CloudCommandBaseOptions {
	snapshotId: string;
}

export interface CloudProvidersListCommandOptions
	extends CloudCommandBaseOptions {}

export interface CloudProvidersCreateCommandOptions
	extends CloudCommandBaseOptions {
	provider: string;
	keyName: string;
	secret: string;
	restUrl?: string | undefined;
	embeddingModel?: string | undefined;
	rerankModel?: string | undefined;
}

export interface CloudProvidersTestCommandOptions
	extends CloudCommandBaseOptions {
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
const CONFLICT_RESOLUTIONS = new Set<SyncConflictResolution>([
	"keep_cloud",
	"use_client",
	"ignore",
]);

export async function runCloudHealthCommand(
	options: CloudHealthCommandOptions,
): Promise<number> {
	const client = createCloudClient(options, true, true);
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

export async function runCloudContextCommand(
	options: CloudContextCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudRecallCommand(
	options: CloudRecallCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudRecallIndexCommand(
	options: CloudRecallIndexCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudRememberCommand(
	options: CloudRememberCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudReadCommand(
	options: CloudReadCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudUpdateCoreCommand(
	options: CloudUpdateCoreCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudRecentCommand(
	options: CloudRecentCommandOptions,
): Promise<number> {
	return runCloudReadCommand({ ...options, target: "notes" });
}

export async function runCloudValidateCommand(
	options: CloudValidateCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudSyncStatusCommand(
	options: CloudSyncStatusCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudSyncPullCommand(
	options: CloudSyncPullCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudSyncPushCommand(
	options: CloudSyncPushCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudSyncResolveCommand(
	options: CloudSyncResolveCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
	const resolution = normalizeConflictResolution(options.resolution);
	const content = options.contentJson
		? parseJsonObject(options.contentJson, "content JSON")
		: undefined;
	const result = await client.sync.resolveConflict({
		conflictId: options.conflictId,
		resolution,
		...(content !== undefined ? { content } : {}),
	});
	if (options.json) {
		printJsonEnvelope(options.output, "cloud.sync.resolve", result);
		return 0;
	}
	options.output.success(`Resolved conflict ${result.conflictId}`);
	if (result.serverVersion !== undefined)
		options.output.write(`serverVersion: ${result.serverVersion}`);
	return result.resolved ? 0 : 1;
}

export async function runCloudReadinessCommand(
	options: CloudReadinessCommandOptions,
): Promise<number> {
	const client = createCloudClient(options, true, true);
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

export async function runCloudContextComposeCommand(
	options: CloudContextComposeCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudGraphListNodesCommand(
	options: CloudGraphListNodesCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudGraphCreateNodeCommand(
	options: CloudGraphCreateNodeCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudGraphListEdgesCommand(
	options: CloudGraphListEdgesCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudGraphCreateEdgeCommand(
	options: CloudGraphCreateEdgeCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudGraphNeighborsCommand(
	options: CloudGraphNeighborsCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudGraphPathCommand(
	options: CloudGraphPathCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudExtractionRunCommand(
	options: CloudExtractionRunCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudExtractionJobsCommand(
	options: CloudExtractionJobsCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudEvalsRunCommand(
	options: CloudEvalsRunCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudBenchmarksRunCommand(
	options: CloudBenchmarksRunCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudExportsCreateCommand(
	options: CloudExportsCreateCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudExportsDownloadCommand(
	options: CloudExportsDownloadCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudSnapshotsCreateCommand(
	options: CloudSnapshotsCreateCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudSnapshotsDownloadCommand(
	options: CloudSnapshotsDownloadCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudProvidersListCommand(
	options: CloudProvidersListCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudProvidersCreateCommand(
	options: CloudProvidersCreateCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

export async function runCloudProvidersTestCommand(
	options: CloudProvidersTestCommandOptions,
): Promise<number> {
	const client = createCloudClient(options);
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

function createCloudClient(
	options: CloudCommandBaseOptions,
	allowMissingApiKey = false,
	allowMissingProjectId = false,
): TekMemoCloudClient {
	return createCliCloudClient({
		cloudUrl: options.cloudUrl,
		apiKey: options.apiKey,
		workspaceId: options.workspaceId,
		projectId: options.projectId,
		timeoutMs: options.timeoutMs,
		allowMissingApiKey,
		allowMissingProjectId,
	});
}

function normalizeMemoryKind(value: string | undefined): MemoryKind {
	const candidate = value ?? "note";
	if (!MEMORY_KINDS.has(candidate as MemoryKind)) {
		throw new CliUsageError(
			`kind must be one of: ${[...MEMORY_KINDS].join(", ")}.`,
		);
	}
	return candidate as MemoryKind;
}

function normalizeRecallStrategy(
	value: string | undefined,
): RecallStrategy | undefined {
	if (value === undefined) return undefined;
	if (RECALL_STRATEGIES.has(value as RecallStrategy))
		return value as RecallStrategy;
	throw new CliUsageError("recall strategy must be local, vector, or hybrid.");
}

function normalizeRecallFallback(
	value: string | undefined,
): RecallFallbackMode | undefined {
	if (value === undefined) return undefined;
	if (RECALL_FALLBACKS.has(value as RecallFallbackMode))
		return value as RecallFallbackMode;
	throw new CliUsageError("recall fallback must be none or local.");
}

function normalizeIndexMode(
	value: string | undefined,
): RecallIndexMode | undefined {
	if (value === undefined) return undefined;
	if (INDEX_MODES.has(value as RecallIndexMode))
		return value as RecallIndexMode;
	throw new CliUsageError("index mode must be all, changed, core, or notes.");
}

function normalizeConflictResolution(value: string): SyncConflictResolution {
	if (CONFLICT_RESOLUTIONS.has(value as SyncConflictResolution))
		return value as SyncConflictResolution;
	throw new CliUsageError(
		"conflict resolution must be keep_cloud, use_client, or ignore.",
	);
}

function normalizeConfidence(value: string | number): number {
	return parseConfidence(String(value));
}

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

function truncateText(text: string, maxBytes: number | undefined): string {
	if (maxBytes === undefined || text.length <= maxBytes) return text;
	return `${text.slice(0, Math.max(0, maxBytes - 40)).trimEnd()}\n\n[truncated by --max-bytes]`;
}

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

function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
