import {
	bootstrapMemoryStore,
	CORE_MEMORY_PATH,
	MANIFEST_PATH,
	MemoryNotFoundError,
	MemoryPathError,
	TEKMEMO_PATHS,
} from "@tekbreed/tekmemo";
import { describe, expect, test } from "vitest";
import {
	AgentfsClientError,
	AgentfsMemoryStore,
	AgentfsValidationError,
	createAgentfsMemoryStore,
	resolveAgentfsMemoryPath,
} from "../../src/index";
import { InMemoryAgentfsClient } from "./test-utils";

describe("AgentfsMemoryStore", () => {
	test("uses the canonical .tekmemo protocol path", async () => {
		const client = new InMemoryAgentfsClient();
		const store = createAgentfsMemoryStore(client, {
			scope: "project",
			projectId: "proj_123",
		});

		await store.write(CORE_MEMORY_PATH, "# Core\n");

		expect(
			client.files.get("/stores/project/proj_123/.tekmemo/memory/core.md"),
		).toBe("# Core\n");
		await expect(store.read(CORE_MEMORY_PATH)).resolves.toBe("# Core\n");
	});

	test("accepts real-SDK-shaped clients through the structural boundary", async () => {
		const files = new Map<string, string>();
		const agentfsSdkLikeClient = {
			readText: async (path: string) => files.get(path) ?? "",
			writeText: async (path: string, content: string) => {
				files.set(path, content);
			},
			appendText: async (path: string, content: string) => {
				files.set(path, `${files.get(path) ?? ""}${content}`);
			},
			exists: async (path: string) => files.has(path),
			sync: {
				pull: async () => {},
				push: async () => {},
				checkpoint: async (_label: string) => {},
			},
		};
		const store = createAgentfsMemoryStore(agentfsSdkLikeClient, {
			scope: "project",
			projectId: "proj_123",
		});

		await store.write(CORE_MEMORY_PATH, "# Core\n");
		await store.append(CORE_MEMORY_PATH, "More\n");

		await expect(store.read(CORE_MEMORY_PATH)).resolves.toBe("# Core\nMore\n");
	});

	test("returns remote root and normalized config", () => {
		const client = new InMemoryAgentfsClient();
		const store = new AgentfsMemoryStore(client, {
			scope: "project",
			projectId: "proj_123",
		});

		expect(store.getRoot()).toBe("/stores/project/proj_123");
		expect(store.getConfig().missingFileBehavior).toBe("throw");
	});

	test("rejects unsupported memory paths", async () => {
		const client = new InMemoryAgentfsClient();
		const store = new AgentfsMemoryStore(client, {
			scope: "project",
			projectId: "proj_123",
		});

		await expect(
			store.write(".tekmemo/../../evil" as never, "x"),
		).rejects.toThrow(MemoryPathError);
		await expect(store.read("/memories/core.md" as never)).rejects.toThrow(
			MemoryPathError,
		);
	});

	test("throws on missing file by default", async () => {
		const store = new AgentfsMemoryStore(new InMemoryAgentfsClient(), {
			scope: "project",
			projectId: "proj_123",
		});

		await expect(store.read(CORE_MEMORY_PATH)).rejects.toThrow(
			MemoryNotFoundError,
		);
	});

	test("can return empty string for missing files when configured", async () => {
		const store = new AgentfsMemoryStore(new InMemoryAgentfsClient(), {
			scope: "project",
			projectId: "proj_123",
			missingFileBehavior: "empty",
		});

		await expect(store.read(CORE_MEMORY_PATH)).resolves.toBe("");
	});

	test("exists uses native exists when available", async () => {
		const client = new InMemoryAgentfsClient();
		const store = new AgentfsMemoryStore(client, {
			scope: "project",
			projectId: "proj_123",
		});

		await expect(store.exists(CORE_MEMORY_PATH)).resolves.toBe(false);
		await store.write(CORE_MEMORY_PATH, "content");
		await expect(store.exists(CORE_MEMORY_PATH)).resolves.toBe(true);
	});

	test("exists falls back to readText when native exists is unavailable", async () => {
		const client = new InMemoryAgentfsClient({ exists: false });
		const store = new AgentfsMemoryStore(client, {
			scope: "project",
			projectId: "proj_123",
		});

		await expect(store.exists(CORE_MEMORY_PATH)).resolves.toBe(false);
		await store.write(CORE_MEMORY_PATH, "content");
		await expect(store.exists(CORE_MEMORY_PATH)).resolves.toBe(true);
	});

	test("append uses native append when available", async () => {
		const client = new InMemoryAgentfsClient({ nativeAppend: true });
		const store = new AgentfsMemoryStore(client, {
			scope: "project",
			projectId: "proj_123",
		});

		await store.write(TEKMEMO_PATHS.events.memoryEvents, "");
		await store.append(TEKMEMO_PATHS.events.memoryEvents, "a\n");
		await store.append(TEKMEMO_PATHS.events.memoryEvents, "b\n");

		await expect(store.read(TEKMEMO_PATHS.events.memoryEvents)).resolves.toBe(
			"a\nb\n",
		);
	});

	test("append falls back to read + write when appendText is unavailable", async () => {
		const client = new InMemoryAgentfsClient({ nativeAppend: false });
		const store = new AgentfsMemoryStore(client, {
			scope: "project",
			projectId: "proj_123",
		});

		await store.append(TEKMEMO_PATHS.events.memoryEvents, "a\n");
		await store.append(TEKMEMO_PATHS.events.memoryEvents, "b\n");

		await expect(store.read(TEKMEMO_PATHS.events.memoryEvents)).resolves.toBe(
			"a\nb\n",
		);
	});

	test("append can reject fallback when disabled", async () => {
		const client = new InMemoryAgentfsClient({ nativeAppend: false });
		const store = new AgentfsMemoryStore(client, {
			scope: "project",
			projectId: "proj_123",
			allowReadWriteAppendFallback: false,
		});

		await expect(
			store.append(TEKMEMO_PATHS.events.memoryEvents, "a\n"),
		).rejects.toThrow(AgentfsValidationError);
	});

	test("wraps client write failures in core MemoryStoreError", async () => {
		const client = new InMemoryAgentfsClient();
		client.failWrite = true;
		const store = new AgentfsMemoryStore(client, {
			scope: "project",
			projectId: "proj_123",
		});

		await expect(store.write(CORE_MEMORY_PATH, "x")).rejects.toMatchObject({
			code: "TEKMEMO_STORE_ERROR",
		});
	});

	test("wraps non-string client read response", async () => {
		const client = new InMemoryAgentfsClient() as InMemoryAgentfsClient & {
			readText: (path: string) => Promise<string>;
		};
		client.readText = async () => 123 as never;
		const store = new AgentfsMemoryStore(client, {
			scope: "project",
			projectId: "proj_123",
		});

		await expect(store.read(CORE_MEMORY_PATH)).rejects.toThrow(
			AgentfsClientError,
		);
	});

	test("rejects non-string content", async () => {
		const store = new AgentfsMemoryStore(new InMemoryAgentfsClient(), {
			scope: "project",
			projectId: "proj_123",
		});

		await expect(store.write(CORE_MEMORY_PATH, 1 as never)).rejects.toThrow(
			AgentfsValidationError,
		);
		await expect(store.append(CORE_MEMORY_PATH, 1 as never)).rejects.toThrow(
			AgentfsValidationError,
		);
	});

	test("bootstraps all .tekmemo protocol files through core helpers", async () => {
		const client = new InMemoryAgentfsClient();
		const store = new AgentfsMemoryStore(client, {
			scope: "project",
			projectId: "proj_123",
		});

		await bootstrapMemoryStore(store);

		expect(await store.exists(MANIFEST_PATH)).toBe(true);
		expect(await store.exists(TEKMEMO_PATHS.memory.core)).toBe(true);
		expect(await store.exists(TEKMEMO_PATHS.events.conversations)).toBe(true);
		expect(await store.exists(TEKMEMO_PATHS.indexes.chunks)).toBe(true);
	});
});

describe("resolveAgentfsMemoryPath", () => {
	test("combines remote root and canonical path safely", () => {
		expect(
			resolveAgentfsMemoryPath("/stores/project/proj_123", CORE_MEMORY_PATH),
		).toBe("/stores/project/proj_123/.tekmemo/memory/core.md");
	});

	test("rejects unsafe root", () => {
		expect(() =>
			resolveAgentfsMemoryPath("/stores/../x", CORE_MEMORY_PATH),
		).toThrow();
		expect(() =>
			resolveAgentfsMemoryPath("/stores\\x", CORE_MEMORY_PATH),
		).toThrow();
		expect(() => resolveAgentfsMemoryPath("", CORE_MEMORY_PATH)).toThrow();
	});
});
