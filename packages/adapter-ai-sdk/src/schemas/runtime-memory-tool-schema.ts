import { z } from "zod";

export const runtimeMemoryScopeSchema = z.enum([
	"project",
	"workspace",
	"tenant",
	"user",
	"conversation",
	"participant-shared",
]);

export const runtimeMemoryToolInputSchema = z.discriminatedUnion("command", [
	z.object({
		command: z.literal("read_core_memory"),
	}),
	z.object({
		command: z.literal("update_core_memory"),
		content: z.string().min(1).max(100_000),
	}),
	z.object({
		command: z.literal("remember"),
		content: z.string().min(1).max(50_000),
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
	}),
	z.object({
		command: z.literal("list_notes"),
		limit: z.number().int().positive().max(50).optional(),
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
		tag: z.string().min(1).max(100).optional(),
	}),
	z.object({
		command: z.literal("recall"),
		query: z.string().min(1).max(5_000),
		topK: z.number().int().positive().max(50).optional(),
		strategy: z.enum(["local", "vector", "hybrid"]).optional(),
		rerank: z.boolean().optional(),
	}),
	z.object({
		command: z.literal("build_context"),
		query: z.string().min(1).max(5_000).optional(),
		includeCoreMemory: z.boolean().optional(),
		includeNotes: z.boolean().optional(),
		includeRecall: z.boolean().optional(),
		maxChars: z.number().int().positive().max(100_000).optional(),
	}),
	z.object({
		command: z.literal("index"),
		mode: z.enum(["all", "changed", "core", "notes"]).optional(),
		force: z.boolean().optional(),
	}),
]);

export type RuntimeMemoryToolInput = z.infer<
	typeof runtimeMemoryToolInputSchema
>;
