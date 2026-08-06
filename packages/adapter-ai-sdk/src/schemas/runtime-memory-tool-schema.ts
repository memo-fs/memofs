import { z } from "zod";

export const runtimeMemoryScopeSchema = z.enum([
	"project",
	"workspace",
	"tenant",
	"user",
	"conversation",
	"participant-shared",
]);

export const runtimeMemoryToolInputSchema = z.object({
	command: z.enum([
		"read_core_memory",
		"update_core_memory",
		"remember",
		"list_notes",
		"recall",
		"build_context",
		"index",
	]),
	content: z.string().min(1).max(100_000).optional(),
	kind: z
		.enum([
			"decision",
			"constraint",
			"goal",
			"preference",
			"reference",
			"summary",
			"note",
		])
		.optional(),
	title: z.string().min(1).max(500).optional(),
	tags: z.array(z.string().min(1).max(100)).max(25).optional(),
	confidence: z.number().min(0).max(1).optional(),
	source: z.string().min(1).max(500).optional(),
	scope: runtimeMemoryScopeSchema.optional(),
	visibility: z.enum(["private", "shared", "system"]).optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
	limit: z.number().int().positive().max(50).optional(),
	tag: z.string().min(1).max(100).optional(),
	query: z.string().min(1).max(5_000).optional(),
	topK: z.number().int().positive().max(50).optional(),
	strategy: z.enum(["local", "vector", "hybrid"]).optional(),
	rerank: z.boolean().optional(),
	includeCoreMemory: z.boolean().optional(),
	includeNotes: z.boolean().optional(),
	includeRecall: z.boolean().optional(),
	maxChars: z.number().int().positive().max(100_000).optional(),
	mode: z.enum(["all", "changed", "core", "notes"]).optional(),
	force: z.boolean().optional(),
});

export type RuntimeMemoryToolInput = z.infer<
	typeof runtimeMemoryToolInputSchema
>;
