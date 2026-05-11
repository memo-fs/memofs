import {
	TekMemoCloudConfigurationError,
	TekMemoCloudValidationError,
} from "./errors.js";
import type {
	ApproveAgentSessionMemoryInput,
	CompleteAgentSessionInput,
	CreateAgentSessionEventInput,
	CreateAgentSessionInput,
	CreateNoteInput,
	ExtractAgentSessionMemoryInput,
	JsonObject,
	ListNotesInput,
	RecallIndexInput,
	RecallQueryInput,
	ResolveConflictInput,
	SyncPullInput,
	SyncPushInput,
	SyncStatusInput,
	TekMemoCloudBenchmarkRunInput,
	TekMemoCloudContextComposeInput,
	TekMemoCloudEvalRunInput,
	TekMemoCloudExportInput,
	TekMemoCloudExtractionJobsInput,
	TekMemoCloudExtractionRunInput,
	TekMemoCloudGraphEdge,
	TekMemoCloudGraphListInput,
	TekMemoCloudGraphNode,
	TekMemoCloudProviderInput,
	TekMemoCloudSnapshotInput,
	UpdateCoreMemoryInput,
} from "./types.js";

export function assertNonEmptyString(
	value: unknown,
	fieldName: string,
): asserts value is string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: `${fieldName} must be a non-empty string.`,
		});
	}
}

export function assertOptionalPositiveInteger(
	value: unknown,
	fieldName: string,
): void {
	if (value === undefined || value === null) return;
	if (!Number.isInteger(value) || (value as number) <= 0) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: `${fieldName} must be a positive integer.`,
		});
	}
}

export function assertOptionalBoolean(value: unknown, fieldName: string): void {
	if (value === undefined || value === null) return;
	if (typeof value !== "boolean") {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: `${fieldName} must be a boolean.`,
		});
	}
}

export function assertOptionalJsonObject(
	value: unknown,
	fieldName: string,
): asserts value is JsonObject | undefined {
	if (value === undefined) return;
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: `${fieldName} must be a JSON object.`,
		});
	}
	try {
		JSON.stringify(value);
	} catch (cause) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: `${fieldName} must be JSON serializable.`,
			cause,
		});
	}
}

export function assertProjectId(value: unknown, fallback?: string): string {
	const projectId =
		typeof value === "string" && value.trim() ? value : fallback;
	assertNonEmptyString(projectId, "projectId");
	return projectId.trim();
}

export function normalizeBaseUrl(baseUrl: string): string {
	assertNonEmptyString(baseUrl, "baseUrl");
	let url: URL;
	try {
		url = new URL(baseUrl.trim());
	} catch (cause) {
		throw new TekMemoCloudConfigurationError({
			code: "invalid_base_url",
			message: "baseUrl must be a valid absolute URL.",
			cause,
		});
	}
	if (
		url.protocol !== "https:" &&
		url.hostname !== "localhost" &&
		url.hostname !== "127.0.0.1"
	) {
		throw new TekMemoCloudConfigurationError({
			code: "insecure_base_url",
			message:
				"baseUrl must use https, except for localhost self-hosted development.",
		});
	}
	url.pathname = url.pathname.replace(/\/+$/, "");
	url.search = "";
	url.hash = "";
	return url.toString().replace(/\/$/, "");
}

export function normalizeApiKey(
	apiKey: string | undefined,
): string | undefined {
	if (apiKey === undefined) return undefined;
	const trimmed = apiKey.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function validateUpdateCoreInput(
	input: UpdateCoreMemoryInput,
): UpdateCoreMemoryInput {
	assertNonEmptyString(input.content, "content");
	return input;
}

export function validateCreateNoteInput(
	input: CreateNoteInput,
): CreateNoteInput {
	assertNonEmptyString(input.content, "content");
	if (input.title !== undefined) assertNonEmptyString(input.title, "title");
	if (input.source !== undefined) assertNonEmptyString(input.source, "source");
	if (
		input.confidence !== undefined &&
		(typeof input.confidence !== "number" ||
			input.confidence < 0 ||
			input.confidence > 1)
	) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "confidence must be between 0 and 1.",
		});
	}
	if (
		input.tags !== undefined &&
		(!Array.isArray(input.tags) ||
			input.tags.some(
				(tag) => typeof tag !== "string" || tag.trim().length === 0,
			))
	) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "tags must be an array of non-empty strings.",
		});
	}
	assertOptionalJsonObject(input.metadata, "metadata");
	return input;
}

export function validateListNotesInput(input: ListNotesInput): ListNotesInput {
	assertOptionalPositiveInteger(input.limit, "limit");
	return input;
}

export function validateRecallQueryInput(
	input: RecallQueryInput,
): RecallQueryInput {
	assertNonEmptyString(input.query, "query");
	assertOptionalPositiveInteger(input.topK, "topK");
	assertOptionalBoolean(input.rerank, "rerank");
	assertOptionalJsonObject(input.filters, "filters");
	return input;
}

export function validateRecallIndexInput(
	input: RecallIndexInput,
): RecallIndexInput {
	assertOptionalBoolean(input.force, "force");
	return input;
}

export function validateSyncPushInput(input: SyncPushInput): SyncPushInput {
	assertNonEmptyString(input.clientId, "clientId");
	if (!Array.isArray(input.events)) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "events must be an array.",
		});
	}
	for (const [index, event] of input.events.entries()) {
		assertNonEmptyString(event.clientEventId, `events[${index}].clientEventId`);
		assertNonEmptyString(event.type, `events[${index}].type`);
		assertOptionalJsonObject(event.payload, `events[${index}].payload`);
	}
	return input;
}

export function validateSyncPullInput(input: SyncPullInput): SyncPullInput {
	assertNonEmptyString(input.clientId, "clientId");
	assertOptionalPositiveInteger(input.limit, "limit");
	if (
		input.sinceServerVersion !== undefined &&
		(!Number.isInteger(input.sinceServerVersion) ||
			input.sinceServerVersion < 0)
	) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "sinceServerVersion must be a non-negative integer.",
		});
	}
	return input;
}

export function validateSyncStatusInput(
	input: SyncStatusInput,
): SyncStatusInput {
	return input;
}

export function validateResolveConflictInput(
	input: ResolveConflictInput,
): ResolveConflictInput {
	assertNonEmptyString(input.conflictId, "conflictId");
	if (!["keep_cloud", "use_client", "ignore"].includes(input.resolution)) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "resolution must be keep_cloud, use_client, or ignore.",
		});
	}
	assertOptionalJsonObject(input.content, "content");
	return input;
}

export function validateContextComposeInput(
	input: TekMemoCloudContextComposeInput,
): TekMemoCloudContextComposeInput {
	assertNonEmptyString(input.query, "query");
	assertOptionalPositiveInteger(input.topK, "topK");
	assertOptionalBoolean(input.rerank, "rerank");
	assertOptionalBoolean(input.includeCoreMemory, "includeCoreMemory");
	assertOptionalBoolean(input.includeRecallResults, "includeRecallResults");
	assertOptionalBoolean(input.includeGraphContext, "includeGraphContext");
	assertOptionalPositiveInteger(input.graphDepth, "graphDepth");
	assertOptionalPositiveInteger(input.graphLimit, "graphLimit");
	assertOptionalPositiveInteger(
		input.maxContextCharacters,
		"maxContextCharacters",
	);
	assertOptionalPositiveInteger(
		input.maxSourceCharacters,
		"maxSourceCharacters",
	);
	return input;
}

export function validateGraphNode(
	input: TekMemoCloudGraphNode,
): TekMemoCloudGraphNode {
	assertNonEmptyString(input.nodeId, "nodeId");
	assertNonEmptyString(input.type, "type");
	assertNonEmptyString(input.label, "label");
	assertOptionalJsonObject(input.metadata, "metadata");
	return input;
}

export function validateGraphEdge(
	input: TekMemoCloudGraphEdge,
): TekMemoCloudGraphEdge {
	assertNonEmptyString(input.fromNodeId, "fromNodeId");
	assertNonEmptyString(input.toNodeId, "toNodeId");
	assertNonEmptyString(input.type, "type");
	if (
		input.weight !== undefined &&
		(typeof input.weight !== "number" || input.weight < 0 || input.weight > 1)
	) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "weight must be between 0 and 1.",
		});
	}
	assertOptionalJsonObject(input.metadata, "metadata");
	return input;
}

export function validateExtractionRunInput(
	input: TekMemoCloudExtractionRunInput,
): TekMemoCloudExtractionRunInput {
	assertOptionalBoolean(input.force, "force");
	return input;
}

export function validateExtractionJobsInput(
	input: TekMemoCloudExtractionJobsInput,
): TekMemoCloudExtractionJobsInput {
	assertOptionalPositiveInteger(input.limit, "limit");
	return input;
}

export function validateEvalRunInput(
	input: TekMemoCloudEvalRunInput,
): TekMemoCloudEvalRunInput {
	assertOptionalPositiveInteger(input.graphDepth, "graphDepth");
	assertOptionalPositiveInteger(input.graphLimit, "graphLimit");
	assertOptionalPositiveInteger(
		input.maxContextCharacters,
		"maxContextCharacters",
	);
	assertOptionalPositiveInteger(
		input.maxSourceCharacters,
		"maxSourceCharacters",
	);
	assertOptionalBoolean(input.rerank, "rerank");
	return input;
}

export function validateBenchmarkRunInput(
	input: TekMemoCloudBenchmarkRunInput,
): TekMemoCloudBenchmarkRunInput {
	assertOptionalPositiveInteger(input.iterations, "iterations");
	assertOptionalPositiveInteger(input.warmupIterations, "warmupIterations");
	assertOptionalJsonObject(input.thresholds, "thresholds");
	// Inherit all validation from EvalRunInput
	return validateEvalRunInput(input);
}

export function validateExportInput(
	input: TekMemoCloudExportInput,
): TekMemoCloudExportInput {
	return input;
}

export function validateSnapshotInput(
	input: TekMemoCloudSnapshotInput,
): TekMemoCloudSnapshotInput {
	return input;
}

export function validateProviderInput(
	input: TekMemoCloudProviderInput,
): TekMemoCloudProviderInput {
	assertNonEmptyString(input.keyName, "keyName");
	assertNonEmptyString(input.secret, "secret");
	if (!["voyageai", "openai", "upstash-vector"].includes(input.provider)) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "provider must be voyageai, openai, or upstash-vector.",
		});
	}
	return input;
}

export function validateCreateAgentSessionInput(
	input: CreateAgentSessionInput,
): CreateAgentSessionInput {
	assertNonEmptyString(input.sessionId, "sessionId");
	assertNonEmptyString(input.task, "task");
	if (input.actorId !== undefined)
		assertNonEmptyString(input.actorId, "actorId");
	if (input.workspaceRoot !== undefined)
		assertNonEmptyString(input.workspaceRoot, "workspaceRoot");
	if (
		input.workspaceProvider !== undefined &&
		!["agentfs", "local", "hosted"].includes(input.workspaceProvider)
	) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "workspaceProvider must be agentfs, local, or hosted.",
		});
	}
	assertOptionalJsonObject(input.metadata, "metadata");
	return input;
}

export function validateCreateAgentSessionEventInput(
	input: CreateAgentSessionEventInput,
): CreateAgentSessionEventInput {
	assertNonEmptyString(input.sessionId, "sessionId");
	assertNonEmptyString(input.type, "type");
	assertNonEmptyString(input.message, "message");
	if (input.occurredAt !== undefined)
		assertNonEmptyString(input.occurredAt, "occurredAt");
	assertOptionalJsonObject(input.metadata, "metadata");
	return input;
}

export function validateExtractAgentSessionMemoryInput(
	input: ExtractAgentSessionMemoryInput,
): ExtractAgentSessionMemoryInput {
	assertNonEmptyString(input.sessionId, "sessionId");
	if (input.summary !== undefined && typeof input.summary !== "string") {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "summary must be a string.",
		});
	}
	if (
		input.durableMemory !== undefined &&
		typeof input.durableMemory !== "string"
	) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "durableMemory must be a string.",
		});
	}
	if (input.followUps !== undefined && typeof input.followUps !== "string") {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "followUps must be a string.",
		});
	}
	if (input.errors !== undefined && typeof input.errors !== "string") {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "errors must be a string.",
		});
	}
	if (input.changes !== undefined && typeof input.changes !== "string") {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "changes must be a string.",
		});
	}
	if (input.checkpointLabel !== undefined)
		assertNonEmptyString(input.checkpointLabel, "checkpointLabel");
	return input;
}

export function validateApproveAgentSessionMemoryInput(
	input: ApproveAgentSessionMemoryInput,
): ApproveAgentSessionMemoryInput {
	assertNonEmptyString(input.sessionId, "sessionId");
	assertNonEmptyString(input.extractionId, "extractionId");
	if (input.content !== undefined)
		assertNonEmptyString(input.content, "content");
	if (input.title !== undefined) assertNonEmptyString(input.title, "title");
	if (
		input.tags !== undefined &&
		(!Array.isArray(input.tags) ||
			input.tags.some(
				(tag) => typeof tag !== "string" || tag.trim().length === 0,
			))
	) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "tags must be an array of non-empty strings.",
		});
	}
	if (input.approvedBy !== undefined)
		assertNonEmptyString(input.approvedBy, "approvedBy");
	return input;
}

export function validateCompleteAgentSessionInput(
	input: CompleteAgentSessionInput,
): CompleteAgentSessionInput {
	assertNonEmptyString(input.sessionId, "sessionId");
	if (
		input.status !== undefined &&
		!["active", "completed", "failed", "abandoned"].includes(input.status)
	) {
		throw new TekMemoCloudValidationError({
			code: "invalid_input",
			message: "status must be active, completed, failed, or abandoned.",
		});
	}
	if (input.checkpointLabel !== undefined)
		assertNonEmptyString(input.checkpointLabel, "checkpointLabel");
	if (input.completedAt !== undefined)
		assertNonEmptyString(input.completedAt, "completedAt");
	return input;
}

export function validateGraphListInput(
	input: TekMemoCloudGraphListInput,
): TekMemoCloudGraphListInput {
	assertOptionalPositiveInteger(input.limit, "limit");
	return input;
}

export function compactQuery(
	input: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean> {
	const output: Record<string, string | number | boolean> = {};
	for (const [key, value] of Object.entries(input)) {
		if (value !== undefined && value !== null && value !== "")
			output[key] = value;
	}
	return output;
}
