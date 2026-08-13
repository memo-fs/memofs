import { InMemoryMemoryStore } from "@memofs/core";
import type { MemoFsCloudClient } from "@memofs/core/cloud-client";
import { describe, expect, it } from "vitest";
import { createMemoFSCloudMcpRuntime } from "../src/http/cloud-runtime";
import {
	callMemoFSTool,
	createMemoFSMcpProtocolServer,
	createMemoFSMcpRuntimeFromConfig,
} from "../src/index";
import { createToolDefinitions } from "../src/tools/definitions";

/**
 * Builds a fake MemoFS Cloud client matching the v1.0.0-alpha.0 §7 contract
 * (only `health`, `readiness`, `sync.{push,complete,pull,status}`). The cloud is
 * a file replica, not an engine — there are no memory/recall/graph/extraction
 * namespaces. Each method records its invocation on `calls` so tests can assert
 * the cloud runtime delegates to the project-scoped sync surface.
 */
function makeFakeCloudClient(calls: string[]): MemoFsCloudClient {
	return {
		async health() {
			calls.push("health");
			return {
				ok: true,
				name: "memofs-cloud",
				version: "1.0.0-alpha.0",
				capabilities: ["sync", "cloud"],
			};
		},
		async readiness() {
			calls.push("readiness");
			return {
				ok: true,
				name: "memofs-cloud",
				version: "1.0.0-alpha.0",
				capabilities: ["sync", "cloud"],
			};
		},
		sync: {
			async push(input) {
				calls.push(`sync.push:${input.projectId ?? "default"}`);
				return {
					upload: [
						{
							path: ".memofs/memory/core.md",
							sha256: "abc123",
							sizeBytes: 42,
							presignedPutUrl: "https://r2.example.com/put/abc123",
						},
					],
					cursor: "cursor-after-push",
				};
			},
			async complete(input) {
				calls.push(`sync.complete:${input.projectId ?? "default"}`);
				return {
					cursor: "cursor-after-complete",
					manifest: {
						".memofs/memory/core.md": {
							path: ".memofs/memory/core.md",
							sha256: "abc123",
							sizeBytes: 42,
							updatedAt: "2026-06-20T00:00:00.000Z",
						},
					},
				};
			},
			async pull(input) {
				calls.push(`sync.pull:${input?.projectId ?? "default"}`);
				return {
					files: [],
					removed: [],
					cursor: "cursor-after-pull",
					manifest: {},
				};
			},
			async status(input) {
				calls.push(`sync.status:${input?.projectId ?? "default"}`);
				return {
					manifest: {
						".memofs/memory/core.md": {
							path: ".memofs/memory/core.md",
							sha256: "abc123",
							sizeBytes: 42,
							updatedAt: "2026-06-20T00:00:00.000Z",
						},
					},
					cursor: "srv-cursor-7",
					storageBytes: 1337,
				};
			},
		},
	};
}

describe("MCP tools", () => {
	it("write tool can be blocked by authorization policy", async () => {
		const result = await callMemoFSTool(
			{
				runtime: createMemoFSMcpRuntimeFromConfig({
					mode: "local",
					store: new InMemoryMemoryStore(),
					recall: { localEmbeddings: false },
				}),
				authorize: ({ safety }) => safety === "read",
			},
			"memofs.remember",
			{ content: "Save this durable preference" },
		);
		expect(result.isError).toBe(true);
		const text =
			result.content[0]?.type === "text" ? result.content[0]?.text : "";
		expect(text).toMatch(/MCP_AUTHORIZATION_ERROR/);
	});

	it("source refs reject path traversal and non-http URLs", async () => {
		const result = await callMemoFSTool(
			{
				runtime: createMemoFSMcpRuntimeFromConfig({
					mode: "local",
					store: new InMemoryMemoryStore(),
					recall: { localEmbeddings: false },
				}),
			},
			"memofs.remember",
			{
				content: "hello",
				sourceRefs: [
					{
						sourceType: "document",
						path: "../secret",
						url: "file:///tmp/nope",
					},
				],
			},
		);
		expect(result.isError).toBe(true);
		const text =
			result.content[0]?.type === "text" ? result.content[0]?.text : "";
		expect(text).toMatch(/path/);
	});

	it("memofs.remember schema exposes the optional code-anchor field and round-trips it through recall", async () => {
		// Schema contract: the `memofs.remember` inputSchema MUST expose
		// the optional `anchor` field so model callers can bind a memory
		// to a code file.
		const definitions = createToolDefinitions(100);
		const remember = definitions.find((d) => d.name === "memofs.remember");
		expect(remember, "memofs.remember tool must be defined").toBeDefined();
		const schema = remember?.inputSchema as {
			properties?: {
				anchor?: {
					properties?: { file?: unknown; hash?: unknown; symbol?: unknown };
					required?: string[];
				};
			};
		};
		expect(
			schema.properties?.anchor,
			"anchor property must be declared",
		).toBeDefined();
		expect(
			schema.properties?.anchor?.properties?.file,
			"anchor.file property",
		).toBeDefined();
		expect(
			schema.properties?.anchor?.properties?.hash,
			"anchor.hash property",
		).toBeDefined();
		expect(
			schema.properties?.anchor?.properties?.symbol,
			"anchor.symbol property",
		).toBeDefined();
		expect(
			schema.properties?.anchor?.required,
			"anchor requires file+hash",
		).toEqual(["file", "hash"]);

		// Round-trip: writing with `anchor` must be accepted by the tool
		// (proves the schema validates the field, not just documents it).
		const runtime = createMemoFSMcpRuntimeFromConfig({
			mode: "local",
			store: new InMemoryMemoryStore(),
			recall: { localEmbeddings: false },
		});
		const write = await callMemoFSTool({ runtime }, "memofs.remember", {
			content: "Anchor round-trip via MCP.",
			anchor: { file: "src/auth.py", hash: "deadbeef".repeat(8) },
		});
		expect(
			write.isError,
			"anchor field must be accepted by the tool",
		).toBeUndefined();

		// And a follow-up recall must surface the memory (drift detection
		// runs because `src/auth.py` does not exist on disk → file-deleted
		// drift; the memory is still surfaced, rank-demoted not suppressed).
		const recall = await callMemoFSTool({ runtime }, "memofs.recall", {
			query: "Anchor round-trip",
			limit: 5,
		});
		expect(recall.isError).toBeUndefined();
		const text =
			recall.content[0]?.type === "text" ? recall.content[0]?.text : "";
		expect(text).toContain("Anchor round-trip via MCP.");
	});

	it("output text is truncated safely when max output bytes is small", async () => {
		const runtime = createMemoFSMcpRuntimeFromConfig({
			mode: "local",
			store: new InMemoryMemoryStore(),
			recall: { localEmbeddings: false },
		});
		const write = await callMemoFSTool({ runtime }, "memofs.remember", {
			content: "a".repeat(5000),
		});
		expect(write.isError).toBeUndefined();
		const result = await callMemoFSTool(
			{ runtime, maxOutputBytes: 500 },
			"memofs.recall",
			{ query: "aaa", limit: 5 },
		);
		expect(result.content[0]?.type).toBe("text");
		if (result.content[0]?.type === "text") {
			expect(result.content[0]?.text).toMatch(/Output truncated/);
		}
	});

	it("resources/read exposes graph nodes as JSON content", async () => {
		const runtime = createMemoFSMcpRuntimeFromConfig({
			mode: "local",
			store: new InMemoryMemoryStore(),
			recall: { localEmbeddings: false },
		});
		const server = createMemoFSMcpProtocolServer({ runtime });
		// Seed via the runtime method (graph_upsert_nodes is no longer a tool,
		// but the resources surface still reads the graph store it writes).
		// biome-ignore lint/style/noNonNullAssertion: local factory always wires upsertGraphNodes
		await runtime.upsertGraphNodes!({
			nodes: [{ id: "node1", type: "project", label: "Node 1" }],
		});
		const response = (await server.handleJsonRpcMessage({
			jsonrpc: "2.0",
			id: 2,
			method: "resources/read",
			params: { uri: "memofs://graph/nodes?limit=10" },
		})) as unknown as Record<string, unknown>;
		const result = response.result as Record<string, unknown>;
		const contents = result.contents as Array<{ text: string }>;
		expect(contents[0]?.text).toMatch(/node1/);
	});

	it("cloud runtime delegates sync status through the project-scoped file-replica API", async () => {
		const calls: string[] = [];
		const client = makeFakeCloudClient(calls);
		const runtime = createMemoFSCloudMcpRuntime({
			client,
			projectId: "proj_1",
		});
		// sync_status was demoted to a runtime method.
		// biome-ignore lint/style/noNonNullAssertion: cloud runtime always wires syncStatus
		const result = await runtime.syncStatus!({});
		expect(calls).toEqual(["sync.status:proj_1"]);
		expect(result.cursor).toBe("srv-cursor-7");
		expect(result.storageBytes).toBe(1337);
	});

	it("cloud runtime delegates sync push to the two-phase file-replica contract", async () => {
		const calls: string[] = [];
		const client = makeFakeCloudClient(calls);
		const runtime = createMemoFSCloudMcpRuntime({
			client,
			projectId: "proj_1",
		});
		// sync_push is now runtime.syncPush; the cloud-runtime maps it 1:1 onto
		// client.sync.push (the first phase of the push contract). The HTTP/Worker
		// runtime only orchestrates presigned URLs — the byte upload + complete
		// run in the local file-sync layer (see cloud.ts).
		// biome-ignore lint/style/noNonNullAssertion: cloud runtime always wires syncPush
		const result = await runtime.syncPush!({ manifest: {} });
		expect(calls).toEqual(["sync.push:proj_1"]);
		expect(result.cursor).toBe("cursor-after-push");
		expect(Array.isArray(result.upload)).toBe(true);
	});

	it("cloud runtime rejects engine-backed tools (recall) that the file replica does not host", async () => {
		const calls: string[] = [];
		const client = makeFakeCloudClient(calls);
		const runtime = createMemoFSCloudMcpRuntime({
			client,
			projectId: "proj_1",
		});
		// The cloud is a file replica, not an engine: recall runs only against
		// the local filesystem. The Worker-safe runtime omits `recall`, so the
		// tool layer reports the call as unsupported.
		const result = await callMemoFSTool({ runtime }, "memofs.recall", {
			query: "anything",
		});
		expect(result.isError).toBe(true);
		const text =
			result.content[0]?.type === "text" ? result.content[0]?.text : "";
		expect(text).toMatch(/does not support recall/i);
		expect(calls).toEqual([]);
	});

	it("cloud runtime exposes no graph methods (demoted surface is absent on file replica)", async () => {
		const calls: string[] = [];
		const client = makeFakeCloudClient(calls);
		const runtime = createMemoFSCloudMcpRuntime({
			client,
			projectId: "proj_1",
		});
		// The cloud is a file replica, not an engine: graph ops run only locally.
		// The Worker-safe runtime omits graphNeighbors entirely (it was always a
		// runtime-only capability, now no longer wrapped as a tool either).
		expect(runtime.graphNeighbors).toBeUndefined();
		expect(calls).toEqual([]);
	});
});

describe("memofs.context tool schema", () => {
	const definitions = createToolDefinitions(100);
	const contextDef = definitions.find((d) => d.name === "memofs.context");

	it("includes taskType with all 5 enum values", () => {
		expect(contextDef).toBeDefined();
		const schema = contextDef?.inputSchema as Record<string, unknown>;
		const properties = schema.properties as Record<string, unknown>;
		const taskTypeProp = properties.taskType as Record<string, unknown>;
		expect(taskTypeProp).toBeDefined();
		expect(taskTypeProp.type).toBe("string");
		expect(taskTypeProp.enum).toEqual([
			"coding",
			"debug",
			"refactor",
			"docs",
			"general",
		]);
	});
});

describe("memofs_agent_session_complete outcome enum", () => {
	const definitions = createToolDefinitions(100);
	const completeDef = definitions.find(
		(d) => d.name === "memofs_agent_session_complete",
	);

	it("exposes outcome/ephemeral/reason in the input schema", () => {
		expect(
			completeDef,
			"memofs_agent_session_complete tool must be defined",
		).toBeDefined();
		const schema = completeDef?.inputSchema as {
			properties?: Record<string, unknown>;
		};
		const properties = schema.properties ?? {};
		expect(properties.outcome).toBeDefined();
		const outcomeProp = properties.outcome as {
			type: string;
			enum?: unknown[];
		};
		expect(outcomeProp.type).toBe("string");
		expect(outcomeProp.enum).toEqual(["success", "failure", "aborted"]);
		expect(properties.ephemeral).toBeDefined();
		expect((properties.ephemeral as { type: string }).type).toBe("boolean");
		expect(properties.reason).toBeDefined();
		expect((properties.reason as { type: string }).type).toBe("string");
	});

	it("description cautions callers to set outcome explicitly", () => {
		expect(completeDef?.description).toMatch(/set `outcome` explicitly/i);
		expect(completeDef?.description).toMatch(/NOT recommended/i);
	});

	it("dispatches outcome through to the runtime surface", async () => {
		const calls: Array<Record<string, unknown>> = [];
		const runtime = {
			completeAgentSession: async (input: Record<string, unknown>) => {
				calls.push(input);
				return { sessionId: input.sessionId, outcome: input.outcome };
			},
		} as unknown;
		const result = await callMemoFSTool(
			{ runtime: runtime as never },
			"memofs_agent_session_complete",
			{
				sessionId: "session_dispatch",
				outcome: "failure",
				ephemeral: true,
				reason: "hallucination",
			},
		);
		expect(result.isError).toBeUndefined();
		expect(calls).toHaveLength(1);
		expect(calls[0]?.outcome).toBe("failure");
		expect(calls[0]?.ephemeral).toBe(true);
		expect(calls[0]?.reason).toBe("hallucination");
	});

	it("rejects an invalid outcome value with a validation error", async () => {
		const runtime = {
			completeAgentSession: async () => ({}),
		} as unknown;
		const result = await callMemoFSTool(
			{ runtime: runtime as never },
			"memofs_agent_session_complete",
			{
				sessionId: "session_invalid",
				outcome: "lost",
			},
		);
		expect(result.isError).toBe(true);
		const text =
			result.content[0]?.type === "text" ? result.content[0]?.text : "";
		expect(text).toMatch(/outcome must be one of/);
	});

	it("omits outcome/ephemeral/reason from args when absent (backward-compat)", async () => {
		const calls: Array<Record<string, unknown>> = [];
		const runtime = {
			completeAgentSession: async (input: Record<string, unknown>) => {
				calls.push(input);
				return { sessionId: input.sessionId };
			},
		} as unknown;
		await callMemoFSTool(
			{ runtime: runtime as never },
			"memofs_agent_session_complete",
			{ sessionId: "session_legacy" },
		);
		expect(calls[0]).toEqual({ sessionId: "session_legacy" });
		expect("outcome" in (calls[0] ?? {})).toBe(false);
	});
});
