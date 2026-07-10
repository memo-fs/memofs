import { describe, expect, it } from "vitest";
import {
	appendConversationEntry,
	bootstrapMemoryStore,
	CONVERSATIONS_MEMORY_PATH,
	InMemoryMemoryStore,
	MemoryParseError,
	MemoryValidationError,
	readConversationHistory,
	readConversationHistoryWithIssues,
} from "../../src/index";

describe("conversation memory", () => {
	it("appends valid JSONL and parses entries", async () => {
		const store = new InMemoryMemoryStore();
		await bootstrapMemoryStore(store);

		await appendConversationEntry(store, {
			timestamp: "2026-05-02T12:30:00.000Z",
			role: "user",
			content: "Remember project memory.",
			metadata: { source: "test" },
		});

		const entries = await readConversationHistory(store);
		expect(entries).toHaveLength(1);
		expect(entries[0]?.role).toBe("user");
	});

	it("rejects invalid roles", async () => {
		const store = new InMemoryMemoryStore();
		await expect(
			appendConversationEntry(store, {
				timestamp: "2026-05-02T12:30:00.000Z",
				role: "bad" as "user",
				content: "Bad",
			}),
		).rejects.toBeInstanceOf(MemoryValidationError);
	});

	it("throws on malformed JSONL by default", async () => {
		const store = new InMemoryMemoryStore({
			[CONVERSATIONS_MEMORY_PATH]: "{bad json}\n",
		});
		await expect(readConversationHistory(store)).rejects.toBeInstanceOf(
			MemoryParseError,
		);
	});

	it("can skip malformed JSONL and report issues", async () => {
		const store = new InMemoryMemoryStore({
			[CONVERSATIONS_MEMORY_PATH]:
				'{"timestamp":"2026-05-02T12:30:00.000Z","role":"user","content":"ok"}\n{bad json}\n',
		});

		const result = await readConversationHistoryWithIssues(store, {
			malformedLineMode: "skip",
		});
		expect(result.entries).toHaveLength(1);
		expect(result.issues).toHaveLength(1);
	});

	it("rejects circular metadata", async () => {
		const store = new InMemoryMemoryStore();
		const circular: Record<string, unknown> = {};
		circular.self = circular;

		await expect(
			appendConversationEntry(store, {
				timestamp: "2026-05-02T12:30:00.000Z",
				role: "user",
				content: "Bad",
				metadata: circular,
			}),
		).rejects.toBeInstanceOf(MemoryValidationError);
	});
});
