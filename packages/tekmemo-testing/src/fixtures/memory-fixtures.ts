export const MEMORY_FIXTURE_PATHS = {
	core: ".tekmemo/memory/core.md",
	notes: ".tekmemo/memory/notes.md",
	events: ".tekmemo/events/memory-events.jsonl",
	chunks: ".tekmemo/indexes/chunks.jsonl",
} as const;

export const CORE_MEMORY_FIXTURE =
	"# Core Memory\n\n- TekMemo is file-first memory infrastructure.\n";

export const NOTES_MEMORY_FIXTURE = "# Notes\n\n- First note.\n";

export const MEMORY_EVENT_FIXTURE = {
	id: "evt_1",
	type: "memory.updated",
	timestamp: "2026-01-01T00:00:00.000Z",
	summary: "Updated core memory",
};

export const CHUNK_RECORD_FIXTURE = {
	id: "chunk_1",
	sourcePath: ".tekmemo/memory/core.md",
	sourceType: "document",
	sourceId: "core",
	memoryType: "core",
	status: "indexed",
};
