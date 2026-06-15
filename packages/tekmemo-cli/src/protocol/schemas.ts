import { z } from "zod";

const JsonRecordSchema = z.record(z.string(), z.unknown());
const IsoDateSchema = z.string().datetime();
const NonEmptyStringSchema = z.string().min(1);

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

export const ConversationEntrySchema = z.object({
	timestamp: IsoDateSchema,
	role: z.enum(["user", "assistant", "system", "tool"]),
	content: z.string(),
	summary: z.string().optional(),
	metadata: JsonRecordSchema.optional(),
});

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

export const MemoryChunkSchema = ChunkRecordSchema;
