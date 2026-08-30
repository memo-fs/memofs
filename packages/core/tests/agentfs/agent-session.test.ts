import { describe, expect, test, vi } from "vitest";
import {
	MEMORY_EVENTS_PATH,
	NOTES_MEMORY_PATH,
} from "../../src/core/constants/memory-paths";
import {
	createAgentWorkspacePaths,
	createMemoFsAgentSession,
	extractSessionMemory,
	InMemoryMemoryStore,
} from "../../src/index";
import { InMemoryAgentfsClient } from "./test-utils";

describe("MemoFS AgentFS sessions", () => {
	test("creates a stable session workspace path layout", () => {
		const paths = createAgentWorkspacePaths("session_abc", "/workspaces");

		expect(paths.root).toBe("/workspaces/session_abc");
		expect(paths.context.core).toBe("/workspaces/session_abc/context/core.md");
		expect(paths.working.plan).toBe("/workspaces/session_abc/working/plan.md");
		expect(paths.output.durableMemory).toBe(
			"/workspaces/session_abc/output/durable-memory.md",
		);
	});

	test("prepares context and scaffold files without overwriting existing work", async () => {
		const client = new InMemoryAgentfsClient();
		const memory = new InMemoryMemoryStore({
			".memofs/manifest.json": '{"projectId":"proj_123"}\n',
			".memofs/memory/core.md": "# Core\nRemember repo boundaries.\n",
			".memofs/memory/notes.md": "# Notes\nExisting notes.\n",
		});
		const session = createMemoFsAgentSession({
			client,
			memory,
			task: "Refactor auth middleware",
			projectId: "proj_123",
			sessionId: "session_abc",
		});

		await client.writeText(session.paths.working.plan, "# Existing plan\n");
		await session.prepare();

		expect(client.files.get(session.paths.context.core)).toBe(
			"# Core\nRemember repo boundaries.\n",
		);
		expect(client.files.get(session.paths.working.plan)).toBe(
			"# Existing plan\n",
		);
		expect(client.files.get(session.paths.output.summary)).toContain(
			"# Summary",
		);
	});

	test("extracts session output and appends durable memory on completion", async () => {
		const client = new InMemoryAgentfsClient({
			sync: {
				checkpoint: async () => {},
				push: async () => {},
			},
		});
		const memory = new InMemoryMemoryStore({
			".memofs/memory/notes.md": "# Notes\n",
		});
		const session = createMemoFsAgentSession({
			client,
			memory,
			task: "Add CLI command",
			sessionId: "session_cli",
		});

		await session.prepare();
		await client.writeText(session.paths.output.summary, "# Summary\nDone.\n");
		await client.writeText(
			session.paths.output.durableMemory,
			"# Durable Memory\nPrefer explicit CLI flags.\n",
		);
		await client.writeText(
			session.paths.output.followUps,
			"# Follow-ups\nShip docs.\n",
		);
		const result = await session.complete({ extractDurableMemory: true });

		expect(result.extracted).toMatchObject({
			summary: "Done.",
			durableMemory: "Prefer explicit CLI flags.",
			followUps: "Ship docs.",
		});
		expect(result.durableMemoryWritten).toBe(true);
		await expect(memory.read(NOTES_MEMORY_PATH)).resolves.toContain(
			"Prefer explicit CLI flags.",
		);
	});

	test("extractSessionMemory treats missing output files as empty", async () => {
		const client = new InMemoryAgentfsClient();
		const paths = createAgentWorkspacePaths("session_empty");

		await expect(extractSessionMemory(client, paths)).resolves.toEqual({
			summary: "",
			durableMemory: "",
			followUps: "",
			errors: "",
			changes: "",
		});
	});

	test("complete ignores untouched durable-memory scaffold", async () => {
		const client = new InMemoryAgentfsClient();
		const memory = new InMemoryMemoryStore({
			".memofs/memory/notes.md": "# Notes\n",
		});
		const session = createMemoFsAgentSession({
			client,
			memory,
			task: "Investigate agent workspace",
			sessionId: "session_scaffold",
		});

		await session.prepare();
		const result = await session.complete({ extractDurableMemory: true });

		expect(result.extracted.durableMemory).toBe("");
		expect(result.durableMemoryWritten).toBe(false);
		await expect(memory.read(NOTES_MEMORY_PATH)).resolves.toBe("# Notes\n");
	});

	test("surfaces durable-memory storage failures instead of reporting a partial completion", async () => {
		const client = new InMemoryAgentfsClient();
		const memory = new InMemoryMemoryStore({
			".memofs/memory/notes.md": "# Notes\n",
		});
		vi.spyOn(memory, "append").mockRejectedValueOnce(
			new Error("storage unavailable"),
		);
		const session = createMemoFsAgentSession({
			client,
			memory,
			task: "Persist durable output",
			sessionId: "session_storage_failure",
		});

		await session.prepare();
		await client.writeText(
			session.paths.output.durableMemory,
			"# Durable Memory\nPersist this finding.\n",
		);

		await expect(
			session.complete({ extractDurableMemory: true }),
		).rejects.toThrow("storage unavailable");
	});
});

/**
 * Behavior matrix tests for the `outcome` enum.
 * Covers the five-row matrix + resume across `aborted` + the
 * `session.failed` audit event.
 */
describe("AgentFS complete() outcome behavior matrix", () => {
	function setupSession(sessionId: string) {
		const client = new InMemoryAgentfsClient();
		const memory = new InMemoryMemoryStore({
			".memofs/memory/notes.md": "# Notes\n",
		});
		const session = createMemoFsAgentSession({
			client,
			memory,
			task: "matrix-row",
			sessionId,
		});
		return { client, memory, session };
	}

	async function seedWorkspace(
		client: InMemoryAgentfsClient,
		session: ReturnType<typeof setupSession>["session"],
	) {
		await session.prepare();
		await client.writeText(session.paths.working.plan, "# plan\n");
		await client.writeText(session.paths.working.notes, "# notes\n");
		await client.writeText(session.paths.output.summary, "# Summary\nDone.\n");
		await client.writeText(
			session.paths.output.durableMemory,
			"# Durable Memory\nPersist this.\n",
		);
		await client.writeText(
			session.paths.output.followUps,
			"# Follow-ups\nship.\n",
		);
	}

	test("success + extractDurableMemory: true promotes durable, cleans working/, preserves output/", async () => {
		const { client, memory, session } = setupSession("session_success");
		await seedWorkspace(client, session);

		const result = await session.complete({
			outcome: "success",
			extractDurableMemory: true,
		});

		expect(result.outcome).toBe("success");
		expect(result.durableMemoryWritten).toBe(true);
		expect(result.workingCleaned).toBe(true);
		expect(result.outputCleaned).toBe(false);
		expect(result.preserved).toBe(false);
		expect(result.failureEventWritten).toBe(false);

		expect(client.files.has(session.paths.working.plan)).toBe(false);
		expect(client.files.has(session.paths.output.summary)).toBe(true);
		await expect(memory.read(NOTES_MEMORY_PATH)).resolves.toContain(
			"Persist this.",
		);
	});

	test("success + extractDurableMemory: false: no promotion, cleans working/, preserves output/", async () => {
		const { client, memory, session } = setupSession("session_no_promote");
		await seedWorkspace(client, session);

		const result = await session.complete({
			outcome: "success",
			extractDurableMemory: false,
		});

		expect(result.durableMemoryWritten).toBe(false);
		expect(result.workingCleaned).toBe(true);
		expect(result.outputCleaned).toBe(false);
		expect(client.files.has(session.paths.working.plan)).toBe(false);
		expect(client.files.has(session.paths.output.summary)).toBe(true);
		await expect(memory.read(NOTES_MEMORY_PATH)).resolves.toBe("# Notes\n");
	});

	test("failure + ephemeral: true: no promotion, cleans working/ AND output/, writes session.failed event", async () => {
		const { client, memory, session } = setupSession("session_fail_eph");
		await seedWorkspace(client, session);

		const result = await session.complete({
			outcome: "failure",
			ephemeral: true,
			reason: "hallucination",
		});

		expect(result.outcome).toBe("failure");
		expect(result.durableMemoryWritten).toBe(false);
		expect(result.workingCleaned).toBe(true);
		expect(result.outputCleaned).toBe(true);
		expect(result.preserved).toBe(false);
		expect(result.failureEventWritten).toBe(true);

		expect(client.files.has(session.paths.working.plan)).toBe(false);
		expect(client.files.has(session.paths.output.summary)).toBe(false);
		await expect(memory.read(NOTES_MEMORY_PATH)).resolves.toBe("# Notes\n");

		const events = (await memory.read(MEMORY_EVENTS_PATH)).trim().split("\n");
		const failedEvent = events.find((e) => e.includes('"session.failed"'));
		expect(failedEvent).toBeDefined();
		expect(failedEvent).toContain("hallucination");
	});

	test("failure + ephemeral omitted: no promotion, preserves working/ + output/, writes session.failed event", async () => {
		const { client, memory, session } = setupSession("session_fail_audit");
		await seedWorkspace(client, session);

		const result = await session.complete({
			outcome: "failure",
			reason: "bad output",
		});

		expect(result.durableMemoryWritten).toBe(false);
		expect(result.workingCleaned).toBe(false);
		expect(result.outputCleaned).toBe(false);
		expect(result.preserved).toBe(false);
		expect(result.failureEventWritten).toBe(true);

		expect(client.files.has(session.paths.working.plan)).toBe(true);
		expect(client.files.has(session.paths.output.summary)).toBe(true);

		const events = (await memory.read(MEMORY_EVENTS_PATH)).trim().split("\n");
		expect(events.some((e) => e.includes('"session.failed"'))).toBe(true);
	});

	test("aborted: preserves workspace; no promotion; no cleanup; resumable via subsequent success", async () => {
		const { client, memory, session } = setupSession("session_abort");
		await seedWorkspace(client, session);

		const first = await session.complete({
			outcome: "aborted",
			extractDurableMemory: true,
		});

		expect(first.outcome).toBe("aborted");
		expect(first.durableMemoryWritten).toBe(false);
		expect(first.workingCleaned).toBe(false);
		expect(first.outputCleaned).toBe(false);
		expect(first.preserved).toBe(true);
		expect(first.failureEventWritten).toBe(false);

		expect(client.files.has(session.paths.working.plan)).toBe(true);
		expect(client.files.has(session.paths.output.durableMemory)).toBe(true);
		await expect(memory.read(NOTES_MEMORY_PATH)).resolves.toBe("# Notes\n");

		// Resume: same sessionId, fresh session handle, success now promotes.
		const resumed = createMemoFsAgentSession({
			client,
			memory,
			task: "Resumed task",
			sessionId: "session_abort",
		});
		const second = await resumed.complete({
			outcome: "success",
			extractDurableMemory: true,
		});

		expect(second.outcome).toBe("success");
		expect(second.durableMemoryWritten).toBe(true);
		expect(second.workingCleaned).toBe(true);
		expect(second.preserved).toBe(false);
		await expect(memory.read(NOTES_MEMORY_PATH)).resolves.toContain(
			"Persist this.",
		);
	});

	test("backward-compat: absent outcome defaults to success (today's behavior)", async () => {
		const { client, session } = setupSession("session_legacy");
		await seedWorkspace(client, session);

		const result = await session.complete({
			extractDurableMemory: true,
		});

		expect(result.outcome).toBe("success");
		expect(result.durableMemoryWritten).toBe(true);
		expect(result.workingCleaned).toBe(true);
		expect(result.preserved).toBe(false);
	});
});
