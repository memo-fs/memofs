import { describe, expect, it, vi } from "vitest";
import type { TekMemoCloudFetch, TekMemoRuntime } from "../../src/index";
import {
	createCloudTekMemoRuntime,
	createHybridTekMemoRuntime,
	createTekMemoCloudClient,
	TekMemoCloudAuthError,
	TekMemoCloudResponseParseError,
	TekMemoCloudValidationError,
} from "../../src/index";

function jsonResponse(
	body: unknown,
	init: { status?: number; headers?: Record<string, string> } = {},
) {
	return {
		ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
		status: init.status ?? 200,
		statusText: String(init.status ?? 200),
		headers: new Headers(init.headers),
		text: async () => JSON.stringify(body),
	};
}

describe("@tekbreed/tekmemo/cloud", () => {
	it("calls current project-scoped core memory route", async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const fetch: TekMemoCloudFetch = async (url, init) => {
			calls.push({ url: String(url), init });
			return jsonResponse({
				data: { content: "# Core" },
				meta: { requestId: "req_1" },
			});
		};
		const client = createTekMemoCloudClient({
			baseUrl: "https://memo.tekbreed.com/api/v1",
			apiKey: "tk_live_test",
			defaultProjectId: "proj_123",
			fetch,
		});

		await expect(client.memory.readCore()).resolves.toEqual({
			content: "# Core",
		});
		expect(calls[0]?.url).toBe(
			"https://memo.tekbreed.com/api/v1/projects/proj_123/memory/core",
		);
		expect(
			(calls[0]?.init?.headers as Record<string, string>).Authorization,
		).toBe("Bearer tk_live_test");
	});

	it("encodes project IDs and conflict IDs safely", async () => {
		const urls: string[] = [];
		const fetch: TekMemoCloudFetch = async (url) => {
			urls.push(String(url));
			return jsonResponse({
				data: { conflictId: "c/1", resolved: true },
				meta: {},
			});
		};
		const client = createTekMemoCloudClient({
			baseUrl: "https://x.test/api/v1",
			apiKey: "tk_live_test",
			fetch,
		});
		await client.sync.resolveConflict({
			projectId: "proj / unsafe",
			conflictId: "conflict / 1",
			resolution: "ignore",
		});
		expect(urls[0]).toBe(
			"https://x.test/api/v1/projects/proj%20%2F%20unsafe/sync/conflicts/conflict%20%2F%201/resolve",
		);
	});

	it("parses canonical error envelope", async () => {
		const fetch: TekMemoCloudFetch = async () =>
			jsonResponse(
				{
					error: { code: "unauthorized", message: "bad tk_live_secret" },
					meta: { requestId: "req_bad" },
				},
				{ status: 401 },
			);
		const client = createTekMemoCloudClient({
			baseUrl: "https://x.test/api/v1",
			apiKey: "tk_live_secret",
			defaultProjectId: "p",
			fetch,
		});
		await expect(client.memory.readCore()).rejects.toMatchObject({
			code: "unauthorized",
			status: 401,
			requestId: "req_bad",
		});
		await expect(client.memory.readCore()).rejects.not.toThrow(
			"tk_live_secret",
		);
	});

	it("requires API key for protected routes", async () => {
		const client = createTekMemoCloudClient({
			baseUrl: "https://x.test/api/v1",
			defaultProjectId: "p",
			fetch: vi.fn() as unknown as TekMemoCloudFetch,
		});
		await expect(client.memory.readCore()).rejects.toBeInstanceOf(
			TekMemoCloudAuthError,
		);
	});

	it("health does not require API key", async () => {
		const fetch: TekMemoCloudFetch = async () =>
			jsonResponse({ data: { ok: true, name: "tekmemo-cloud" }, meta: {} });
		const client = createTekMemoCloudClient({
			baseUrl: "https://x.test/api/v1",
			fetch,
		});
		await expect(client.health()).resolves.toEqual({
			ok: true,
			name: "tekmemo-cloud",
		});
	});

	it("rejects empty required inputs before request", async () => {
		const client = createTekMemoCloudClient({
			baseUrl: "https://x.test/api/v1",
			apiKey: "tk_live_test",
			defaultProjectId: "p",
			fetch: vi.fn() as unknown as TekMemoCloudFetch,
		});
		expect(() => client.recall.query({ query: "" })).toThrow(
			TekMemoCloudValidationError,
		);
		expect(() => client.memory.createNote({ content: "" })).toThrow(
			TekMemoCloudValidationError,
		);
		expect(() =>
			client.sync.push({
				clientId: "c",
				events: [{ clientEventId: "", type: "x" }],
			}),
		).toThrow(TekMemoCloudValidationError);
	});

	it("rejects invalid response envelope when legacy compatibility is disabled", async () => {
		const fetch: TekMemoCloudFetch = async () =>
			jsonResponse({ ok: true, content: "legacy" });
		const client = createTekMemoCloudClient({
			baseUrl: "https://x.test/api/v1",
			apiKey: "tk_live_test",
			defaultProjectId: "p",
			fetch,
			acceptLegacyEnvelope: false,
		});
		await expect(client.memory.readCore()).rejects.toBeInstanceOf(
			TekMemoCloudResponseParseError,
		);
	});

	it("retries transient statuses", async () => {
		let count = 0;
		const fetch: TekMemoCloudFetch = async () => {
			count += 1;
			if (count === 1)
				return jsonResponse(
					{ error: { code: "server_error", message: "try again" }, meta: {} },
					{ status: 503 },
				);
			return jsonResponse({ data: { content: "ok" }, meta: {} });
		};
		const client = createTekMemoCloudClient({
			baseUrl: "https://x.test/api/v1",
			apiKey: "tk_live_test",
			defaultProjectId: "p",
			fetch,
			retry: { retries: 1, baseDelayMs: 1, maxDelayMs: 1 },
		});
		await expect(client.memory.readCore()).resolves.toEqual({ content: "ok" });
		expect(count).toBe(2);
	});

	it("cloud runtime maps runtime calls to project-scoped cloud calls", async () => {
		const fetch: TekMemoCloudFetch = async (url, init) => {
			if (String(url).endsWith("/recall/query")) {
				expect(JSON.parse(String(init?.body))).toMatchObject({
					query: "billing",
				});
				return jsonResponse({ data: { items: [] }, meta: {} });
			}
			return jsonResponse({ data: { content: "" }, meta: {} });
		};
		const client = createTekMemoCloudClient({
			baseUrl: "https://x.test/api/v1",
			apiKey: "tk_live_test",
			fetch,
		});
		const runtime = createCloudTekMemoRuntime({ client, projectId: "p" });
		await expect(runtime.recall({ query: "billing" })).resolves.toEqual({
			items: [],
		});
	});

	it("hybrid runtime local-first reads fallback to cloud", async () => {
		const warnings: string[] = [];
		const local = {
			readCoreMemory: async () => {
				throw new Error("local unavailable");
			},
			updateCoreMemory: async () => ({ content: "" }),
			listNotes: async () => ({ items: [] }),
			createNote: async () => ({
				id: "local",
				kind: "note" as const,
				content: "",
			}),
			recall: async () => ({ items: [] }),
			contextCompose: async () => ({ context: "", sources: [] }),
			index: async () => ({ status: "skipped" }),
			syncPush: async () => ({
				accepted: [],
				duplicates: [],
				rejected: [],
				conflicts: [],
				serverVersion: 0,
			}),
			syncPull: async () => ({ events: [], serverVersion: 0 }),
			syncStatus: async () => ({
				serverVersion: 0,
				clients: [],
				openConflicts: 0,
			}),
			upsertGraphNodes: async () => [],
			upsertGraphEdges: async () => [],
			graphNeighbors: async () => ({ nodes: [], edges: [] }),
			graphPath: async () => ({ nodes: [], edges: [] }),
		} as unknown as TekMemoRuntime;
		const cloud = {
			readCoreMemory: async () => ({ content: "cloud" }),
			updateCoreMemory: async () => ({ content: "cloud" }),
			listNotes: async () => ({ items: [] }),
			createNote: async () => ({
				id: "cloud",
				kind: "note" as const,
				content: "",
			}),
			recall: async () => ({ items: [] }),
			contextCompose: async () => ({ context: "", sources: [] }),
			index: async () => ({ status: "skipped" }),
			syncPush: async () => ({
				accepted: [],
				duplicates: [],
				rejected: [],
				conflicts: [],
				serverVersion: 0,
			}),
			syncPull: async () => ({ events: [], serverVersion: 0 }),
			syncStatus: async () => ({
				serverVersion: 0,
				clients: [],
				openConflicts: 0,
			}),
			upsertGraphNodes: async () => [],
			upsertGraphEdges: async () => [],
			graphNeighbors: async () => ({ nodes: [], edges: [] }),
			graphPath: async () => ({ nodes: [], edges: [] }),
		} as TekMemoRuntime;
		const runtime = createHybridTekMemoRuntime({
			local,
			cloud,
			readPolicy: "local-first",
			onWarning: (w) => warnings.push(w),
		});
		await expect(runtime.readCoreMemory()).resolves.toEqual({
			content: "cloud",
		});
		expect(warnings[0]).toContain("local unavailable");
	});

	it("hybrid runtime local-first writes mirrors to cloud but returns local result", async () => {
		const calls: string[] = [];
		const local = {
			readCoreMemory: async () => ({ content: "" }),
			updateCoreMemory: async () => ({ content: "" }),
			listNotes: async () => ({ items: [] }),
			recall: async () => ({ items: [] }),
			contextCompose: async () => ({ context: "", sources: [] }),
			index: async () => ({ status: "skipped" as const }),
			syncPush: async () => ({
				accepted: [],
				duplicates: [],
				rejected: [],
				conflicts: [],
				serverVersion: 0,
			}),
			syncPull: async () => ({ events: [], serverVersion: 0 }),
			syncStatus: async () => ({
				serverVersion: 0,
				clients: [],
				openConflicts: 0,
			}),
			upsertGraphNodes: async () => [],
			upsertGraphEdges: async () => [],
			graphNeighbors: async () => ({ nodes: [], edges: [] }),
			graphPath: async () => ({ nodes: [], edges: [] }),
			createNote: async () => {
				calls.push("local");
				return { id: "local", kind: "note" as const, content: "x" };
			},
		} as unknown as TekMemoRuntime;
		const cloud = {
			readCoreMemory: async () => ({ content: "" }),
			updateCoreMemory: async () => ({ content: "" }),
			listNotes: async () => ({ items: [] }),
			recall: async () => ({ items: [] }),
			contextCompose: async () => ({ context: "", sources: [] }),
			index: async () => ({ status: "skipped" as const }),
			syncPush: async () => ({
				accepted: [],
				duplicates: [],
				rejected: [],
				conflicts: [],
				serverVersion: 0,
			}),
			syncPull: async () => ({ events: [], serverVersion: 0 }),
			syncStatus: async () => ({
				serverVersion: 0,
				clients: [],
				openConflicts: 0,
			}),
			upsertGraphNodes: async () => [],
			upsertGraphEdges: async () => [],
			graphNeighbors: async () => ({ nodes: [], edges: [] }),
			graphPath: async () => ({ nodes: [], edges: [] }),
			createNote: async () => {
				calls.push("cloud");
				return { id: "cloud", kind: "note" as const, content: "x" };
			},
		} as TekMemoRuntime;
		const runtime = createHybridTekMemoRuntime({
			local,
			cloud,
			writePolicy: "local-first",
		});
		await expect(runtime.createNote({ content: "x" })).resolves.toMatchObject({
			id: "local",
		});
		expect(calls).toEqual(["local", "cloud"]);
	});

	it("candidates api generates correct urls and payloads", async () => {
		const urls: string[] = [];
		const fetch: TekMemoCloudFetch = async (url) => {
			urls.push(String(url));
			return jsonResponse({ data: { ok: true, items: [] }, meta: {} });
		};
		const client = createTekMemoCloudClient({
			baseUrl: "https://x.test/api/v1",
			apiKey: "tk_test",
			defaultProjectId: "p",
			fetch,
		});

		await client.candidates.create({ content: "test", type: "implicit" });
		await client.candidates.list({ status: "pending" });
		await client.candidates.promote({ candidateId: "c_1" });
		await client.candidates.dismiss({ candidateId: "c_1" });

		expect(urls).toEqual([
			"https://x.test/api/v1/projects/p/candidates",
			"https://x.test/api/v1/projects/p/candidates?status=pending",
			"https://x.test/api/v1/projects/p/candidates/c_1/promote",
			"https://x.test/api/v1/projects/p/candidates/c_1/dismiss",
		]);
	});

	it("sync conflicts api generates correct urls", async () => {
		const urls: string[] = [];
		const fetch: TekMemoCloudFetch = async (url) => {
			urls.push(String(url));
			return jsonResponse({ data: { items: [] }, meta: {} });
		};
		const client = createTekMemoCloudClient({
			baseUrl: "https://x.test/api/v1",
			apiKey: "tk_test",
			defaultProjectId: "p",
			fetch,
		});

		await client.conflicts.list({ status: "open" });

		expect(urls).toEqual([
			"https://x.test/api/v1/projects/p/conflicts?status=open",
		]);
	});
});
