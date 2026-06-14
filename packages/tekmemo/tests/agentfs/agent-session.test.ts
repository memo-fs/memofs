import { InMemoryMemoryStore, NOTES_MEMORY_PATH } from "@tekbreed/tekmemo";
import { describe, expect, test } from "vitest";
import {
	createAgentWorkspacePaths,
	createTekMemoAgentSession,
	extractSessionMemory,
} from "../../src/index";
import { InMemoryAgentfsClient } from "./test-utils";

describe("TekMemo AgentFS sessions", () => {
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
			".tekmemo/manifest.json": '{"projectId":"proj_123"}\n',
			".tekmemo/memory/core.md": "# Core\nRemember repo boundaries.\n",
			".tekmemo/memory/notes.md": "# Notes\nExisting notes.\n",
		});
		const session = createTekMemoAgentSession({
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
			".tekmemo/memory/notes.md": "# Notes\n",
		});
		const session = createTekMemoAgentSession({
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
			".tekmemo/memory/notes.md": "# Notes\n",
		});
		const session = createTekMemoAgentSession({
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
});
