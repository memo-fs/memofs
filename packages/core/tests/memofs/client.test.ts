import { FakeEmbedder } from "@memofs/testing";
import { describe, expect, it } from "vitest";
import {
	CORE_MEMORY_PATH,
	createInMemoryRecallStore,
	InMemoryMemoryStore,
	MemoFS,
	NOTES_MEMORY_PATH,
	readMemoryEvents,
} from "../../src/index";

describe("MemoFS Client", () => {
	it("initializes and lazily bootstraps memory files", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new MemoFS({ store });

		await expect(store.exists(CORE_MEMORY_PATH)).resolves.toBe(false);
		await expect(store.exists(NOTES_MEMORY_PATH)).resolves.toBe(false);

		const coreText = await memo.core.read();
		expect(coreText).toMatch(/# Core Memory/);

		await expect(store.exists(CORE_MEMORY_PATH)).resolves.toBe(true);
		await expect(store.exists(NOTES_MEMORY_PATH)).resolves.toBe(true);
	});

	it("supports explicit bootstrapping", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new MemoFS({ store });

		await memo.bootstrap({
			templates: {
				core: "# Customized Core Memory\n",
			},
		});

		const coreText = await memo.core.read();
		expect(coreText).toBe("# Customized Core Memory\n");
	});

	it("updates core memory and synchronizes chunks/embeddings", async () => {
		const store = new InMemoryMemoryStore();
		const embedder = new FakeEmbedder({ dimensions: 4 });
		const recallStore = createInMemoryRecallStore();
		const memo = new MemoFS({
			store,
			embedder,
			recallStore,
			projectId: "test-proj",
		});

		await memo.core.update("Simba is pair programming with Antigravity.");

		const writtenText = await memo.core.read();
		expect(writtenText).toContain(
			"Simba is pair programming with Antigravity.",
		);

		const results = await memo.recall("pair programming");
		expect(results.items.length).toBeGreaterThan(0);
		expect(results.items[0]?.text).toContain("Simba is pair programming");
	});

	it("writes core memory exactly once per update", async () => {
		class CountingMemoryStore extends InMemoryMemoryStore {
			coreWrites = 0;

			override async write(
				path: Parameters<InMemoryMemoryStore["write"]>[0],
				content: string,
			): Promise<void> {
				if (path === CORE_MEMORY_PATH) this.coreWrites += 1;
				await super.write(path, content);
			}
		}

		const store = new CountingMemoryStore();
		const memo = new MemoFS({ store });
		await memo.bootstrap();
		store.coreWrites = 0;
		await memo.core.update("Core content should not be duplicated.");

		expect(store.coreWrites).toBe(1);
	});

	it("records timestamped notes and synchronizes chunks/embeddings", async () => {
		const store = new InMemoryMemoryStore();
		const embedder = new FakeEmbedder({ dimensions: 4 });
		const recallStore = createInMemoryRecallStore();
		const memo = new MemoFS({
			store,
			embedder,
			recallStore,
			projectId: "test-proj",
			tenantId: "tenant-abc",
		});

		await memo.notes.record({
			content: "Antigravity uses modern web engineering practices.",
			tags: ["best-practices", "agentic-coding"],
			kind: "reference",
		});

		const writtenNotes = await memo.notes.read();
		expect(writtenNotes).toContain(
			"Antigravity uses modern web engineering practices.",
		);

		const results = await memo.recall("modern web engineering");
		expect(results.items.length).toBeGreaterThan(0);
		expect(results.items[0]?.text).toContain(
			"Antigravity uses modern web engineering",
		);
	});

	it("gracefully runs without embedder using text search fallback", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new MemoFS({ store });

		await memo.core.update("No embedder configured but text works.");
		await memo.notes.record({ content: "Offline note for search." });

		const coreText = await memo.core.read();
		expect(coreText).toContain("No embedder configured but text works.");

		const notesText = await memo.notes.read();
		expect(notesText).toContain("Offline note for search.");

		const results = await memo.recall("Offline");
		expect(results.items.length).toBeGreaterThan(0);
	});

	it("executes memory commands via runCommand", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new MemoFS({ store });

		await memo.core.update("Test runCommand content.");
		const output = await memo.runCommand({
			command: "view",
			path: CORE_MEMORY_PATH,
		});

		expect(output).toContain("Test runCommand content.");
	});

	it("manages conversations namespace", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new MemoFS({ store });

		await memo.conversations.append({
			timestamp: "2026-05-02T10:00:00.000Z",
			role: "user",
			content: "hello world",
		});

		const history = await memo.conversations.read();
		expect(history.length).toBe(1);
		expect(history[0]?.content).toBe("hello world");
		expect(history[0]?.role).toBe("user");
	});

	it("manages graph namespace", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new MemoFS({ store });

		const testNode = { id: "a", label: "Entity A", type: "custom" };
		const targetNode = { id: "b", label: "Entity B", type: "custom" };
		const testEdge = {
			id: "a-b",
			from: "a",
			to: "b",
			type: "relates",
		};

		await memo.graph.upsertNodes({ nodes: [testNode, targetNode] });
		await memo.graph.upsertEdges({ nodes: [], edges: [testEdge] });

		const nodesResult = await memo.graph.listNodes({});
		const edgesResult = await memo.graph.listEdges({});

		expect(nodesResult.items.length).toBe(2);
		expect(nodesResult.items[0]?.id).toBe("a");
		expect(edgesResult.items.length).toBe(1);
		expect(edgesResult.items[0]?.id).toBe("a-b");
	});

	it("manages snapshots and restore namespace", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new MemoFS({ store });

		await memo.core.update("Version 1 content.");
		await memo.notes.record({ content: "Note 1 content." });

		const { id } = await memo.snapshots.create({ label: "checkpoint-1" });
		const list = await memo.snapshots.list();
		expect(list.length).toBe(1);
		expect(list[0]?.id).toBe(id);

		await memo.core.update("Version 2 content.");
		await memo.notes.record({ content: "Note 2 content." });

		expect(await memo.core.read()).toContain("Version 2 content.");

		await memo.snapshots.restore(id);

		expect(await memo.core.read()).toContain("Version 1 content.");
		expect(await memo.notes.read()).toContain("Note 1 content.");
	});

	it("coordinates agentfs and rerank namespaces", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new MemoFS({ store });

		const results = [
			{ id: "1", score: 0.5 },
			{ id: "2", score: 0.9 },
		];
		const sorted = memo.rerank.sort(results);
		expect(sorted[0]?.id).toBe("2");
		expect(sorted[0]?.rank).toBe(1);

		const fallback = memo.rerank.createFallback();
		expect(fallback.rerank).toBeDefined();

		const fakeAgentfsClient = {
			readText: async () => "content",
			writeText: async () => {},
			exists: async () => true,
		};

		const session = memo.agentfs.createSession({
			client: fakeAgentfsClient,
			task: "Workspace session test",
		});

		expect(session.sessionId).toBeDefined();
		expect(session.paths.working.plan).toBeDefined();
	});

	it("configures cloud client features", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new MemoFS({
			store,
			cloud: {
				baseUrl: "https://api.test.cloud/v1",
				apiKey: "tk_test_key",
				projectId: "proj_cloud",
			},
		});

		expect(memo.cloud).toBeDefined();
		expect(memo.cloud?.health).toBeTypeOf("function");
	});

	it("supports in-memory store for testing", async () => {
		const memo = new MemoFS({
			mode: "local",
			store: new InMemoryMemoryStore(),
		});

		const health = await memo.health();
		expect(health.ok).toBe(true);
		expect(health.mode).toBe("local");

		const result = await memo.writeMemory({ content: "test memory content" });
		expect(result.created).toBe(true);

		const recall = await memo.recall("test");
		expect(recall.items.length).toBeGreaterThan(0);
	});

	it("threads writer to note frontmatter and memory event actor", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new MemoFS({ store, projectId: "writer-proj" });

		await memo.writeMemory({
			content: "Decision made by Alice.",
			writer: "alice@example.com",
			source: "dashboard",
		});

		const notes = await memo.notes.read();
		expect(notes).toMatch(/- writer: alice@example.com/);
		expect(notes).toMatch(/- source: dashboard/);

		const events = await readMemoryEvents(store);
		const writeEvent = events.find((e) => e.type === "memory.created");
		expect(writeEvent).toBeDefined();
		expect(writeEvent?.actor?.type).toBe("user");
		expect(writeEvent?.actor?.id).toBe("alice@example.com");
	});

	it("defaults to agent actor when writer is omitted (no regression)", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new MemoFS({ store, projectId: "no-writer-proj" });

		await memo.writeMemory({ content: "Anonymous note." });

		const notes = await memo.notes.read();
		expect(notes).not.toMatch(/- writer:/);

		const events = await readMemoryEvents(store);
		const writeEvent = events.find((e) => e.type === "memory.created");
		expect(writeEvent).toBeDefined();
		expect(writeEvent?.actor?.type).toBe("agent");
		expect(writeEvent?.actor?.id).toBe("memofs");
	});
});
