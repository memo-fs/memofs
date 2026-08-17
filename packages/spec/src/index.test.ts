/**
 * Structural validation behavior for the first published MemoFS schema.
 */

import { describe, expect, it } from "vitest";
import { validate } from "./index";

const manifest = {
	version: "1",
	projectId: "demo-project",
	createdAt: "2026-08-17T00:00:00.000Z",
	updatedAt: "2026-08-17T00:00:00.000Z",
	memory: {
		core: "memory/core.md",
		notes: "memory/notes.md",
	},
	events: {
		memoryEvents: "events/memory-events.jsonl",
		conversations: "events/conversations.jsonl",
	},
	indexes: {
		chunks: "indexes/chunks.jsonl",
	},
	graph: {
		nodes: "graph/nodes.jsonl",
		edges: "graph/edges.jsonl",
	},
	snapshots: {
		index: "snapshots/snapshots.jsonl",
	},
};

describe("validate", () => {
	it("accepts a manifest that matches the published schema", () => {
		expect(validate(manifest, "manifest")).toBe(true);
	});

	it("returns validation errors for an invalid manifest", () => {
		const result = validate({ ...manifest, version: 1 }, "manifest");

		expect(Array.isArray(result)).toBe(true);
		expect(result).not.toHaveLength(0);
	});
});
