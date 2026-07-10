/**
 * Zod schemas for the MemoFS memory tool input.
 *
 * @remarks
 * Defines the schema for AI SDK tool calls (view, create, update, search).
 * Used by {@link buildMemoryToolDefinition} to validate tool inputs.
 *
 * @internal
 */

import { z } from "zod";

export const memoryToolInputSchema = z.discriminatedUnion("command", [
	z.object({
		command: z.literal("view"),
		path: z.enum([
			".memofs/memory/core.md",
			".memofs/memory/notes.md",
			".memofs/events/conversations.jsonl",
		]),
	}),
	z.object({
		command: z.literal("create"),
		path: z.enum([
			".memofs/memory/core.md",
			".memofs/memory/notes.md",
			".memofs/events/conversations.jsonl",
		]),
		content: z.string().min(1),
		ifExists: z.enum(["error", "overwrite", "ignore"]).optional(),
	}),
	z.object({
		command: z.literal("update"),
		path: z.enum([
			".memofs/memory/core.md",
			".memofs/memory/notes.md",
			".memofs/events/conversations.jsonl",
		]),
		content: z.string().min(1),
		mode: z.enum(["append", "overwrite"]).optional(),
	}),
	z.object({
		command: z.literal("search"),
		path: z.enum([
			".memofs/memory/notes.md",
			".memofs/events/conversations.jsonl",
		]),
		query: z.string().min(1),
		limit: z.number().int().positive().max(50).optional(),
	}),
]);

export type MemoryToolInput = z.infer<typeof memoryToolInputSchema>;
