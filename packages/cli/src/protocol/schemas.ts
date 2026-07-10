/**
 * CLI Zod schemas for validating manifests, conversation logs, events, chunks, and snapshots.
 *
 * @module schemas
 */

import { z } from "zod";

const JsonRecordSchema = z.record(z.string(), z.unknown());
const IsoDateSchema = z.string().datetime();
const NonEmptyStringSchema = z.string().min(1);

/**
 * Zod validation schema for the MemoFS manifest.json file.
 */
export const ManifestSchema = z.object({
	version: NonEmptyStringSchema,
	projectId: NonEmptyStringSchema.optional(),
	createdAt: IsoDateSchema,
	updatedAt: IsoDateSchema,
	memory: z.object({
		core: NonEmptyStringSchema,
		notes: NonEmptyStringSchema,
	}),
	events: z.object({
		memoryEvents: NonEmptyStringSchema,
		conversations: NonEmptyStringSchema,
	}),
	indexes: z.object({
		chunks: NonEmptyStringSchema,
	}),
	graph: z.object({
		nodes: NonEmptyStringSchema,
		edges: NonEmptyStringSchema,
	}),
	snapshots: z.object({
		index: NonEmptyStringSchema,
	}),
});

/**
 * Zod validation schema for a conversation log entry.
 */
export const ConversationEntrySchema = z.object({
	timestamp: IsoDateSchema,
	role: z.enum(["user", "assistant", "system", "tool"]),
	content: z.string(),
	summary: z.string().optional(),
	metadata: JsonRecordSchema.optional(),
});

/**
 * Zod validation schema for structured memory events.
 */
export const MemoryEventSchema = z.object({
	id: NonEmptyStringSchema,
	type: z.enum([
		"memory.created",
		"memory.updated",
		"memory.merged",
		"memory.conflicted",
		"memory.decayed",
		"memory.forgotten",
		"memory.restored",
		"memory.indexed",
		"memory.reindexed",
		"snapshot.created",
		"sync.started",
		"sync.completed",
		"sync.failed",
	]),
	timestamp: IsoDateSchema,
	projectId: NonEmptyStringSchema.optional(),
	sourcePath: NonEmptyStringSchema.optional(),
	actor: z
		.object({
			type: z.enum(["user", "agent", "system", "api"]),
			id: NonEmptyStringSchema.optional(),
		})
		.optional(),
	summary: NonEmptyStringSchema.optional(),
	metadata: JsonRecordSchema.optional(),
});

/**
 * Zod validation schema for chunk index records.
 */
export const ChunkRecordSchema = z.object({
	chunkId: NonEmptyStringSchema,
	sourcePath: NonEmptyStringSchema,
	sourceType: z.enum([
		"document",
		"note",
		"conversation",
		"event",
		"import",
		"graph",
	]),
	sourceId: NonEmptyStringSchema,
	sourceHash: NonEmptyStringSchema,
	textHash: NonEmptyStringSchema,
	memoryType: z.enum([
		"core",
		"notes",
		"conversation",
		"event",
		"chunk",
		"graph",
	]),
	index: z.number().int().nonnegative(),
	startOffset: z.number().int().nonnegative(),
	endOffset: z.number().int().nonnegative(),
	status: z.enum(["active", "stale", "deleted"]),
	createdAt: IsoDateSchema,
	updatedAt: IsoDateSchema.optional(),
	sectionName: z.string().optional(),
	metadata: JsonRecordSchema.optional(),
});

/**
 * Zod validation schema for snapshot entry descriptors.
 */
export const SnapshotEntrySchema = z.object({
	id: NonEmptyStringSchema,
	path: NonEmptyStringSchema,
	type: z.enum(["manual", "automatic", "pre-sync", "pre-restore"]),
	status: z.enum(["available", "expired", "deleted"]),
	createdAt: IsoDateSchema,
	expiresAt: IsoDateSchema.optional(),
	checksum: NonEmptyStringSchema.optional(),
	metadata: JsonRecordSchema.optional(),
});

/**
 * Alias of ChunkRecordSchema representing a memory chunk.
 */
export const MemoryChunkSchema = ChunkRecordSchema;
