import { buildRuntimeMemoryContext } from "../runtime/build-runtime-memory-context";
import type { RuntimeMemoryToolInput } from "../schemas/runtime-memory-tool-schema";
import { runtimeMemoryToolInputSchema } from "../schemas/runtime-memory-tool-schema";
import {
	canReadMemoryMetadata,
	createRecallFilters,
	createScopeMetadata,
	inferWriteScope,
	normalizeAccessContext,
} from "../scope/scope-policy";
import type { JsonObject, RuntimeMemoryToolOptions } from "../types/runtime";

export function buildRuntimeMemoryToolDefinition(
	options: RuntimeMemoryToolOptions,
) {
	return {
		description:
			"Use TekMemo memory with safe project/user/conversation scope boundaries. Supports local, cloud, or hybrid runtimes.",
		inputSchema: runtimeMemoryToolInputSchema,
		execute: async (input: unknown) => {
			const parsed = runtimeMemoryToolInputSchema.parse(input);
			return runRuntimeMemoryTool(options, parsed);
		},
	};
}

export async function runRuntimeMemoryTool(
	options: RuntimeMemoryToolOptions,
	input: RuntimeMemoryToolInput,
): Promise<string> {
	const access = normalizeAccessContext(options.access);
	const maxContentChars = options.maxContentChars ?? 50_000;

	switch (input.command) {
		case "read_core_memory": {
			const result = await options.runtime.readCoreMemory();
			return JSON.stringify({ ok: true, data: result }, null, 2);
		}
		case "update_core_memory": {
			if (!options.allowCoreUpdates) {
				throw new Error(
					"Core memory updates are disabled for this AI SDK tool.",
				);
			}
			assertSafeContent(input.content, options.allowSecrets, maxContentChars);
			const result = await options.runtime.updateCoreMemory({
				content: input.content,
			});
			return JSON.stringify({ ok: true, data: result }, null, 2);
		}
		case "remember": {
			if (!options.allowWrites) {
				throw new Error("Memory writes are disabled for this AI SDK tool.");
			}
			assertSafeContent(input.content, options.allowSecrets, maxContentChars);
			const scope = inferWriteScope(access, input.scope);
			const metadata = createScopeMetadata({
				context: access,
				scope,
				visibility: input.visibility,
				metadata: toJsonObject(input.metadata),
			});
			const result = await options.runtime.createNote({
				kind: input.kind ?? "note",
				title: input.title,
				content: input.content,
				tags: input.tags,
				confidence: input.confidence,
				source: input.source,
				// createScopeMetadata returns a compacted (undefined-free) object,
				// so it satisfies core's strict JsonObject contract at runtime.
				metadata: metadata as unknown as JsonObject,
			});
			return JSON.stringify({ ok: true, data: result }, null, 2);
		}
		case "list_notes": {
			const result = await options.runtime.listNotes({
				limit: input.limit,
				kind: input.kind,
				tag: input.tag,
			});
			return JSON.stringify(
				{
					ok: true,
					data: {
						...result,
						items: result.items.filter((note) =>
							canReadMemoryMetadata(note.metadata, access),
						),
					},
				},
				null,
				2,
			);
		}
		case "recall": {
			const result = await options.runtime.recall({
				query: input.query,
				topK: input.topK,
				strategy: input.strategy,
				rerank: input.rerank,
				filters: createRecallFilters(access),
			});
			return JSON.stringify(
				{
					ok: true,
					data: {
						...result,
						items: result.items.filter((hit) =>
							canReadMemoryMetadata(hit.metadata, access),
						),
					},
				},
				null,
				2,
			);
		}
		case "build_context": {
			const result = await buildRuntimeMemoryContext({
				runtime: options.runtime,
				access,
				query: input.query,
				includeCoreMemory: input.includeCoreMemory,
				includeNotes: input.includeNotes,
				includeRecall: input.includeRecall,
				maxChars: input.maxChars,
			});
			return JSON.stringify({ ok: true, data: result }, null, 2);
		}
		case "index": {
			if (!options.allowIndexing) {
				throw new Error("Indexing is disabled for this AI SDK tool.");
			}
			if (!options.runtime.index) {
				throw new Error(
					"The configured TekMemo runtime does not support indexing.",
				);
			}
			const result = await options.runtime.index({
				mode: input.mode,
				force: input.force,
			});
			return JSON.stringify({ ok: true, data: result }, null, 2);
		}
	}

	throw new Error("Unsupported runtime memory tool command.");
}

function assertSafeContent(
	content: string,
	allowSecrets: boolean | undefined,
	maxContentChars: number,
): void {
	if (content.length > maxContentChars) {
		throw new Error(
			`Content exceeds maximum length of ${maxContentChars} characters.`,
		);
	}
	if (allowSecrets) return;
	const secretPatterns = [
		/-----BEGIN [A-Z ]*PRIVATE KEY-----/,
		/\b(?:sk|pk|tk|tm)_(?:live|test|selfhosted)_[A-Za-z0-9_-]{8,}\b/,
		/\b(?:OPENAI|VOYAGE|UPSTASH|TEKMEMO)_[A-Z0-9_]*KEY\s*=/,
	];
	for (const pattern of secretPatterns) {
		if (pattern.test(content)) {
			throw new Error(
				"Potential secret detected in memory content. Pass allowSecrets only for intentional secure workflows.",
			);
		}
	}
}

function toJsonObject(value: unknown): JsonObject | undefined {
	if (value === undefined) return undefined;
	if (value && typeof value === "object" && !Array.isArray(value)) {
		JSON.stringify(value);
		return value as JsonObject;
	}
	throw new Error("metadata must be a JSON object when provided.");
}
