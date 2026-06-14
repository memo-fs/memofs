import type {
	AiMemoryAccessContext,
	AiMemoryScope,
	AiMemoryScopeMetadata,
	AiMemoryVisibility,
	JsonObject,
	NormalizedAiMemoryAccessContext,
} from "../types/runtime";

const ALLOWED_SCOPES = new Set<AiMemoryScope>([
	"project",
	"workspace",
	"tenant",
	"user",
	"conversation",
	"participant-shared",
]);

const DEFAULT_PROJECT_SCOPES: AiMemoryScope[] = ["project", "workspace"];

export class TekMemoScopeError extends Error {
	readonly code = "tekmemo_scope_error";
	constructor(
		message: string,
		readonly details: Record<string, unknown> = {},
	) {
		super(message);
		this.name = "TekMemoScopeError";
	}
}

export function normalizeAccessContext(
	context: AiMemoryAccessContext = {},
): NormalizedAiMemoryAccessContext {
	const participantIds = uniqueStrings(context.participantIds ?? []);
	const derived = new Set<AiMemoryScope>(DEFAULT_PROJECT_SCOPES);

	if (context.tenantId) derived.add("tenant");
	if (context.userId) derived.add("user");
	if (context.conversationId) derived.add("conversation");
	if (participantIds.length > 0) derived.add("participant-shared");

	const explicit = context.allowedScopes?.length
		? context.allowedScopes.map(assertMemoryScope)
		: [...derived];

	return {
		...context,
		participantIds,
		allowedScopes: uniqueScopes(explicit),
		includeUserMemory: context.includeUserMemory ?? Boolean(context.userId),
		includeConversationMemory:
			context.includeConversationMemory ?? Boolean(context.conversationId),
		includeProjectMemory: context.includeProjectMemory ?? true,
		includeSharedParticipantMemory:
			context.includeSharedParticipantMemory ?? participantIds.length > 0,
	};
}

export function assertMemoryScope(scope: unknown): AiMemoryScope {
	if (
		typeof scope !== "string" ||
		!ALLOWED_SCOPES.has(scope as AiMemoryScope)
	) {
		throw new TekMemoScopeError("Invalid memory scope.", { scope });
	}
	return scope as AiMemoryScope;
}

export function assertScopeAllowed(
	scope: AiMemoryScope,
	context: NormalizedAiMemoryAccessContext,
): void {
	if (!context.allowedScopes.includes(scope)) {
		throw new TekMemoScopeError(
			"Memory scope is not allowed for this operation.",
			{
				scope,
				allowedScopes: context.allowedScopes,
			},
		);
	}

	if (scope === "user" && !context.userId) {
		throw new TekMemoScopeError("userId is required for user-scoped memory.", {
			scope,
		});
	}

	if (scope === "conversation" && !context.conversationId) {
		throw new TekMemoScopeError(
			"conversationId is required for conversation-scoped memory.",
			{ scope },
		);
	}

	if (scope === "participant-shared" && context.participantIds.length === 0) {
		throw new TekMemoScopeError(
			"participantIds are required for participant-shared memory.",
			{ scope },
		);
	}
}

export function inferWriteScope(
	context: NormalizedAiMemoryAccessContext,
	requested?: AiMemoryScope,
): AiMemoryScope {
	if (requested) {
		const scope = assertMemoryScope(requested);
		assertScopeAllowed(scope, context);
		return scope;
	}

	if (
		context.conversationId &&
		context.allowedScopes.includes("conversation")
	) {
		return "conversation";
	}
	if (context.userId && context.allowedScopes.includes("user")) {
		return "user";
	}
	if (context.allowedScopes.includes("project")) return "project";
	if (context.allowedScopes.includes("workspace")) return "workspace";
	return context.allowedScopes[0] ?? "project";
}

export function createScopeMetadata(input: {
	context: NormalizedAiMemoryAccessContext;
	scope: AiMemoryScope;
	visibility?: AiMemoryVisibility;
	metadata?: JsonObject;
}): AiMemoryScopeMetadata {
	assertScopeAllowed(input.scope, input.context);
	const visibility = input.visibility ?? defaultVisibilityForScope(input.scope);

	return compactObject({
		...(input.metadata ?? {}),
		scope: input.scope,
		visibility,
		tenantId: input.context.tenantId,
		workspaceId: input.context.workspaceId,
		projectId: input.context.projectId,
		userId: input.scope === "user" ? input.context.userId : undefined,
		conversationId:
			input.scope === "conversation" || input.scope === "participant-shared"
				? input.context.conversationId
				: undefined,
		participantIds:
			input.scope === "participant-shared"
				? input.context.participantIds
				: undefined,
		actorId: input.context.actorId,
		createdByPackage: "@tekbreed/tekmemo/ai-sdk",
	}) as unknown as AiMemoryScopeMetadata;
}

export function createRecallFilters(
	contextInput: AiMemoryAccessContext,
	extra?: JsonObject,
): JsonObject {
	const context = normalizeAccessContext(contextInput);
	const scopes: AiMemoryScope[] = [];

	if (context.includeProjectMemory) {
		for (const scope of ["project", "workspace", "tenant"] as const) {
			if (context.allowedScopes.includes(scope)) scopes.push(scope);
		}
	}
	if (
		context.includeUserMemory &&
		context.userId &&
		context.allowedScopes.includes("user")
	) {
		scopes.push("user");
	}
	if (
		context.includeConversationMemory &&
		context.conversationId &&
		context.allowedScopes.includes("conversation")
	) {
		scopes.push("conversation");
	}
	if (
		context.includeSharedParticipantMemory &&
		context.participantIds.length > 0 &&
		context.allowedScopes.includes("participant-shared")
	) {
		scopes.push("participant-shared");
	}

	return compactObject({
		...(extra ?? {}),
		projectId: context.projectId,
		workspaceId: context.workspaceId,
		tenantId: context.tenantId,
		scopes: uniqueScopes(scopes),
		userId: context.includeUserMemory ? context.userId : undefined,
		conversationId: context.includeConversationMemory
			? context.conversationId
			: undefined,
		participantIds: context.includeSharedParticipantMemory
			? context.participantIds
			: undefined,
	}) as JsonObject;
}

export function canReadMemoryMetadata(
	metadata: JsonObject | undefined,
	contextInput: AiMemoryAccessContext,
): boolean {
	if (!metadata) return true;
	const context = normalizeAccessContext(contextInput);
	const scopeValue = metadata.scope;
	if (
		typeof scopeValue !== "string" ||
		!ALLOWED_SCOPES.has(scopeValue as AiMemoryScope)
	) {
		// Older memory without explicit scope is treated as project/workspace memory.
		return context.includeProjectMemory;
	}

	const scope = scopeValue as AiMemoryScope;
	if (!context.allowedScopes.includes(scope)) return false;

	if (
		(scope === "project" || scope === "workspace" || scope === "tenant") &&
		context.includeProjectMemory
	) {
		return true;
	}
	if (scope === "user") {
		return context.includeUserMemory && metadata.userId === context.userId;
	}
	if (scope === "conversation") {
		return (
			context.includeConversationMemory &&
			metadata.conversationId === context.conversationId
		);
	}
	if (scope === "participant-shared") {
		const ids = Array.isArray(metadata.participantIds)
			? metadata.participantIds.filter(
					(id): id is string => typeof id === "string",
				)
			: [];
		return (
			context.includeSharedParticipantMemory &&
			metadata.conversationId === context.conversationId &&
			ids.every((id) => context.participantIds.includes(id))
		);
	}
	return false;
}

function defaultVisibilityForScope(scope: AiMemoryScope): AiMemoryVisibility {
	if (scope === "user") return "private";
	if (scope === "conversation") return "shared";
	if (scope === "participant-shared") return "shared";
	return "system";
}

function uniqueStrings(values: string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueScopes(values: AiMemoryScope[]): AiMemoryScope[] {
	return [...new Set(values)];
}

function compactObject(
	value: Record<string, unknown>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (entry === undefined) continue;
		if (Array.isArray(entry) && entry.length === 0) continue;
		result[key] = entry;
	}
	return result;
}
