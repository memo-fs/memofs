import type { TekMemoCloudClient } from "@tekmemo/core/cloud-client";
import { describe, expect, it } from "vitest";
import { createTekMemoCloudMcpRuntime } from "../src/http/cloud-runtime";
import {
	callTekMemoTool,
	createTekMemoMcpProtocolServer,
	createTekMemoMcpRuntimeFromConfig,
} from "../src/index";

/**
 * Builds a fake TekMemo Cloud client matching the v1.0.0-alpha.0 §7 contract
 * (only `health`, `readiness`, `sync.{push,complete,pull,status}`). The cloud is
 * a file replica, not an engine — there are no memory/recall/graph/extraction
 * namespaces. Each method records its invocation on `calls` so tests can assert
 * the cloud runtime delegates to the project-scoped sync surface.
 */
function makeFakeCloudClient(calls: string[]): TekMemoCloudClient {
	return {
		async health() {
			calls.push("health");
			return {
				ok: true,
				name: "tekmemo-cloud",
				version: "1.0.0-alpha.0",
				capabilities: ["sync", "cloud"],
			};
		},
		async readiness() {
			calls.push("readiness");
			return {
				ok: true,
				name: "tekmemo-cloud",
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
							path: ".tekmemo/memory/core.md",
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
						".tekmemo/memory/core.md": {
							path: ".tekmemo/memory/core.md",
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
						".tekmemo/memory/core.md": {
							path: ".tekmemo/memory/core.md",
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
		const result = await callTekMemoTool(
			{
				runtime: createTekMemoMcpRuntimeFromConfig({ mode: "memory" }),
				authorize: ({ safety }) => safety === "read",
			},
			"tekmemo.remember",
			{ content: "Save this durable preference" },
		);
		expect(result.isError).toBe(true);
		const text =
			result.content[0]?.type === "text" ? result.content[0]?.text : "";
		expect(text).toMatch(/MCP_AUTHORIZATION_ERROR/);
	});

	it("source refs reject path traversal and non-http URLs", async () => {
		const result = await callTekMemoTool(
			{ runtime: createTekMemoMcpRuntimeFromConfig({ mode: "memory" }) },
			"tekmemo.remember",
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

	it("output text is truncated safely when max output bytes is small", async () => {
		const runtime = createTekMemoMcpRuntimeFromConfig({ mode: "memory" });
		const write = await callTekMemoTool({ runtime }, "tekmemo.remember", {
			content: "a".repeat(5000),
		});
		expect(write.isError).toBeUndefined();
		const result = await callTekMemoTool(
			{ runtime, maxOutputBytes: 500 },
			"tekmemo.recall",
			{ query: "aaa", limit: 5 },
		);
		expect(result.content[0]?.type).toBe("text");
		if (result.content[0]?.type === "text") {
			expect(result.content[0]?.text).toMatch(/Output truncated/);
		}
	});

	it("resources/read exposes graph nodes as JSON content", async () => {
		const runtime = createTekMemoMcpRuntimeFromConfig({ mode: "memory" });
		const server = createTekMemoMcpProtocolServer({ runtime });
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
			params: { uri: "tekmemo://graph/nodes?limit=10" },
		})) as unknown as Record<string, unknown>;
		const result = response.result as Record<string, unknown>;
		const contents = result.contents as Array<{ text: string }>;
		expect(contents[0]?.text).toMatch(/node1/);
	});

	it("cloud runtime delegates sync status through the project-scoped file-replica API", async () => {
		const calls: string[] = [];
		const client = makeFakeCloudClient(calls);
		const runtime = createTekMemoCloudMcpRuntime({
			client,
			projectId: "proj_1",
		});
		// sync_status was demoted to a runtime method (ADR 0009 Component 1).
		// biome-ignore lint/style/noNonNullAssertion: cloud runtime always wires syncStatus
		const result = await runtime.syncStatus!({});
		expect(calls).toEqual(["sync.status:proj_1"]);
		expect(result.cursor).toBe("srv-cursor-7");
		expect(result.storageBytes).toBe(1337);
	});

	it("cloud runtime delegates sync push to the two-phase file-replica contract", async () => {
		const calls: string[] = [];
		const client = makeFakeCloudClient(calls);
		const runtime = createTekMemoCloudMcpRuntime({
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
		const runtime = createTekMemoCloudMcpRuntime({
			client,
			projectId: "proj_1",
		});
		// The cloud is a file replica, not an engine: recall runs only against
		// the local filesystem. The Worker-safe runtime omits `recall`, so the
		// tool layer reports the call as unsupported.
		const result = await callTekMemoTool({ runtime }, "tekmemo.recall", {
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
		const runtime = createTekMemoCloudMcpRuntime({
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
