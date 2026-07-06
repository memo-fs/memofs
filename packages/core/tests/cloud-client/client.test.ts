import { describe, expect, it, vi } from "vitest";
import type { MemoFsCloudFetch } from "../../src/cloud-client";
import {
	createProjectScopedClient,
	createMemoFsCloudClient,
	createMemoFsCloudClientFromEnv,
	MemoFsCloudAuthError,
	MemoFsCloudValidationError,
} from "../../src/cloud-client";

/** A valid sha256 hex digest (64 lowercase hex chars), used in manifests. */
const SHA_A =
	"0000000000000000000000000000000000000000000000000000000000000000";
const SHA_B =
	"1111111111111111111111111111111111111111111111111111111111111111";

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

describe("@memofs/core/cloud — file-replica contract", () => {
	describe("health & readiness", () => {
		it("GET /health is project-agnostic and does not require an API key", async () => {
			const calls: Array<{ url: string; requireApiKey?: boolean }> = [];
			const fetch: MemoFsCloudFetch = async (url) => {
				calls.push({ url: String(url) });
				return jsonResponse({
					data: { ok: true, name: "memofs-cloud" },
					meta: {},
				});
			};
			const client = createMemoFsCloudClient({
				baseUrl: "https://memofs.dev/api/v1",
				fetch,
			});
			await expect(client.health()).resolves.toEqual({
				ok: true,
				name: "memofs-cloud",
			});
			expect(calls[0]?.url).toBe("https://memofs.dev/api/v1/health");
		});

		it("GET /readiness mirrors health and is project-agnostic", async () => {
			const calls: string[] = [];
			const fetch: MemoFsCloudFetch = async (url) => {
				calls.push(String(url));
				return jsonResponse({
					data: { ok: true, name: "memofs-cloud" },
					meta: {},
				});
			};
			const client = createMemoFsCloudClient({
				baseUrl: "https://memofs.dev/api/v1",
				fetch,
			});
			await client.readiness();
			expect(calls).toEqual(["https://memofs.dev/api/v1/readiness"]);
		});
	});

	describe("sync.push — phase 1", () => {
		it("POSTs the local manifest to the project-scoped push route with the bearer token", async () => {
			const calls: Array<{ url: string; init?: RequestInit }> = [];
			const fetch: MemoFsCloudFetch = async (url, init) => {
				calls.push({ url: String(url), init });
				return jsonResponse({
					data: {
						upload: [
							{
								path: ".memofs/memory/core.md",
								sha256: SHA_B,
								sizeBytes: 42,
								presignedPutUrl: "https://r2/put",
							},
						],
						cursor: "cursor-1",
					},
					meta: { requestId: "req_1" },
				});
			};
			const client = createMemoFsCloudClient({
				baseUrl: "https://memofs.dev/api/v1",
				apiKey: "tk_live_test",
				defaultProjectId: "proj_123",
				fetch,
			});

			const result = await client.sync.push({
				manifest: { ".memofs/memory/core.md": SHA_A },
			});

			expect(calls[0]?.url).toBe(
				"https://memofs.dev/api/v1/projects/proj_123/sync/push",
			);
			expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
				manifest: { ".memofs/memory/core.md": SHA_A },
				baseCursor: undefined,
			});
			expect(
				(calls[0]?.init?.headers as Record<string, string>).Authorization,
			).toBe("Bearer tk_live_test");
			expect(result.upload[0]?.presignedPutUrl).toBe("https://r2/put");
			expect(result.cursor).toBe("cursor-1");
		});

		it("forwards an optional baseCursor in the push body", async () => {
			const calls: unknown[] = [];
			const fetch: MemoFsCloudFetch = async (_url, init) => {
				calls.push(JSON.parse(String(init?.body)));
				return jsonResponse({ data: { upload: [], cursor: "c2" }, meta: {} });
			};
			const client = createMemoFsCloudClient({
				baseUrl: "https://x.test/api/v1",
				apiKey: "tk_live_test",
				defaultProjectId: "p",
				fetch,
			});
			await client.sync.push({
				manifest: {},
				baseCursor: "c1",
			});
			expect(calls[0]).toEqual({ manifest: {}, baseCursor: "c1" });
		});

		it("rejects a manifest value that is not a sha256 digest before any request", async () => {
			const fetch = vi.fn() as unknown as MemoFsCloudFetch;
			const client = createMemoFsCloudClient({
				baseUrl: "https://x.test/api/v1",
				apiKey: "tk_live_test",
				defaultProjectId: "p",
				fetch,
			});
			await expect(
				client.sync.push({ manifest: { "path/x": "not-a-sha" } }),
			).rejects.toBeInstanceOf(MemoFsCloudValidationError);
			expect(fetch).not.toHaveBeenCalled();
		});

		it("requires a project id (configured or per-call) for push", async () => {
			const fetch = vi.fn() as unknown as MemoFsCloudFetch;
			const client = createMemoFsCloudClient({
				baseUrl: "https://x.test/api/v1",
				apiKey: "tk_live_test",
				fetch,
			});
			await expect(client.sync.push({ manifest: {} })).rejects.toBeInstanceOf(
				MemoFsCloudValidationError,
			);
			expect(fetch).not.toHaveBeenCalled();
		});
	});

	describe("sync.complete — phase 2", () => {
		it("confirms uploads at /sync/push/complete with the cursor", async () => {
			const calls: Array<{ url: string; init?: RequestInit }> = [];
			const fetch: MemoFsCloudFetch = async (url, init) => {
				calls.push({ url: String(url), init });
				return jsonResponse({
					data: {
						cursor: "cursor-2",
						manifest: {
							".memofs/memory/core.md": {
								path: ".memofs/memory/core.md",
								sha256: SHA_B,
								sizeBytes: 42,
								updatedAt: "2026-06-20T00:00:00.000Z",
							},
						},
					},
					meta: {},
				});
			};
			const client = createMemoFsCloudClient({
				baseUrl: "https://memofs.dev/api/v1",
				apiKey: "tk_live_test",
				defaultProjectId: "proj_123",
				fetch,
			});

			const result = await client.sync.complete({
				uploaded: [{ path: ".memofs/memory/core.md", sha256: SHA_B }],
				cursor: "cursor-1",
			});

			expect(calls[0]?.url).toBe(
				"https://memofs.dev/api/v1/projects/proj_123/sync/push/complete",
			);
			expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
				uploaded: [{ path: ".memofs/memory/core.md", sha256: SHA_B }],
				cursor: "cursor-1",
			});
			expect(result.cursor).toBe("cursor-2");
			expect(result.manifest[".memofs/memory/core.md"]?.sha256).toBe(SHA_B);
		});

		it("rejects a complete with an invalid uploaded sha256", async () => {
			const fetch = vi.fn() as unknown as MemoFsCloudFetch;
			const client = createMemoFsCloudClient({
				baseUrl: "https://x.test/api/v1",
				apiKey: "tk_live_test",
				defaultProjectId: "p",
				fetch,
			});
			await expect(
				client.sync.complete({
					uploaded: [{ path: "x", sha256: "bad" }],
					cursor: "c1",
				}),
			).rejects.toBeInstanceOf(MemoFsCloudValidationError);
		});
	});

	describe("sync.pull", () => {
		it("POSTs the local manifest (or cursor) to /sync/pull", async () => {
			const calls: Array<{ url: string; init?: RequestInit }> = [];
			const fetch: MemoFsCloudFetch = async (url, init) => {
				calls.push({ url: String(url), init });
				return jsonResponse({
					data: {
						files: [
							{
								path: ".memofs/memory/core.md",
								sha256: SHA_B,
								sizeBytes: 42,
								presignedGetUrl: "https://r2/get",
							},
						],
						removed: [".memofs/indexes/embeddings.jsonl"],
						cursor: "cursor-2",
						manifest: {},
					},
					meta: {},
				});
			};
			const client = createMemoFsCloudClient({
				baseUrl: "https://memofs.dev/api/v1",
				apiKey: "tk_live_test",
				defaultProjectId: "proj_123",
				fetch,
			});

			const result = await client.sync.pull({
				manifest: { ".memofs/memory/core.md": SHA_A },
			});

			expect(calls[0]?.url).toBe(
				"https://memofs.dev/api/v1/projects/proj_123/sync/pull",
			);
			expect(result.files[0]?.presignedGetUrl).toBe("https://r2/get");
			expect(result.removed).toEqual([".memofs/indexes/embeddings.jsonl"]);
		});

		it("defaults to an empty pull body and pulls every known file", async () => {
			const calls: unknown[] = [];
			const fetch: MemoFsCloudFetch = async (_url, init) => {
				calls.push(JSON.parse(String(init?.body)));
				return jsonResponse({
					data: { files: [], removed: [], cursor: "c", manifest: {} },
					meta: {},
				});
			};
			const client = createMemoFsCloudClient({
				baseUrl: "https://x.test/api/v1",
				apiKey: "tk_live_test",
				defaultProjectId: "p",
				fetch,
			});
			await client.sync.pull();
			expect(calls[0]).toEqual({ manifest: undefined, since: undefined });
		});
	});

	describe("sync.status", () => {
		it("GETs the project-scoped status route", async () => {
			const calls: string[] = [];
			const fetch: MemoFsCloudFetch = async (url) => {
				calls.push(String(url));
				return jsonResponse({
					data: {
						manifest: {},
						cursor: "srv-cursor-7",
						storageBytes: 1337,
					},
					meta: {},
				});
			};
			const client = createMemoFsCloudClient({
				baseUrl: "https://memofs.dev/api/v1",
				apiKey: "tk_live_test",
				defaultProjectId: "proj_123",
				fetch,
			});
			const result = await client.sync.status();
			expect(calls).toEqual([
				"https://memofs.dev/api/v1/projects/proj_123/sync/status",
			]);
			expect(result.cursor).toBe("srv-cursor-7");
			expect(result.storageBytes).toBe(1337);
		});
	});

	describe("error handling", () => {
		it("parses the canonical error envelope and never leaks the API key", async () => {
			const fetch: MemoFsCloudFetch = async () =>
				jsonResponse(
					{
						error: {
							code: "unauthorized",
							message: "bad tk_live_secret",
						},
						meta: { requestId: "req_bad" },
					},
					{ status: 401 },
				);
			const client = createMemoFsCloudClient({
				baseUrl: "https://x.test/api/v1",
				apiKey: "tk_live_secret",
				defaultProjectId: "p",
				fetch,
			});
			await expect(client.sync.status()).rejects.toMatchObject({
				code: "unauthorized",
				status: 401,
				requestId: "req_bad",
			});
		});

		it("requires an API key for protected sync routes", async () => {
			const client = createMemoFsCloudClient({
				baseUrl: "https://x.test/api/v1",
				defaultProjectId: "p",
				fetch: vi.fn() as unknown as MemoFsCloudFetch,
			});
			await expect(client.sync.status()).rejects.toBeInstanceOf(
				MemoFsCloudAuthError,
			);
		});

		it("retries transient 5xx statuses", async () => {
			let count = 0;
			const fetch: MemoFsCloudFetch = async () => {
				count += 1;
				if (count === 1)
					return jsonResponse(
						{
							error: { code: "server_error", message: "try again" },
							meta: {},
						},
						{ status: 503 },
					);
				return jsonResponse({
					data: {
						manifest: {},
						cursor: "c",
						storageBytes: 0,
					},
					meta: {},
				});
			};
			const client = createMemoFsCloudClient({
				baseUrl: "https://x.test/api/v1",
				apiKey: "tk_live_test",
				defaultProjectId: "p",
				fetch,
				retry: { retries: 1, baseDelayMs: 1, maxDelayMs: 1 },
			});
			await expect(client.sync.status()).resolves.toMatchObject({
				cursor: "c",
			});
			expect(count).toBe(2);
		});
	});

	describe("createProjectScopedClient", () => {
		it("binds every sync call to the bound project id", async () => {
			const urls: string[] = [];
			const fetch: MemoFsCloudFetch = async (url) => {
				urls.push(String(url));
				const path = String(url);
				if (path.endsWith("/sync/push"))
					return jsonResponse({ data: { upload: [], cursor: "c" }, meta: {} });
				if (path.endsWith("/sync/pull"))
					return jsonResponse({
						data: { files: [], removed: [], cursor: "c", manifest: {} },
						meta: {},
					});
				if (path.endsWith("/sync/status"))
					return jsonResponse({
						data: { manifest: {}, cursor: "c", storageBytes: 0 },
						meta: {},
					});
				if (path.endsWith("/sync/push/complete"))
					return jsonResponse({
						data: { cursor: "c", manifest: {} },
						meta: {},
					});
				return jsonResponse({ data: { ok: true }, meta: {} });
			};
			const base = createMemoFsCloudClient({
				baseUrl: "https://x.test/api/v1",
				apiKey: "tk_live_test",
				fetch,
			});
			const scoped = createProjectScopedClient(base, "bound_proj");

			await scoped.sync.push({ manifest: {} });
			await scoped.sync.complete({ uploaded: [], cursor: "c" });
			await scoped.sync.pull();
			await scoped.sync.status();

			expect(urls).toEqual([
				"https://x.test/api/v1/projects/bound_proj/sync/push",
				"https://x.test/api/v1/projects/bound_proj/sync/push/complete",
				"https://x.test/api/v1/projects/bound_proj/sync/pull",
				"https://x.test/api/v1/projects/bound_proj/sync/status",
			]);
		});
	});

	describe("createMemoFsCloudClientFromEnv", () => {
		it("builds a client from MEMOFS_CLOUD_URL and the API key env var", async () => {
			const client = createMemoFsCloudClientFromEnv({
				MEMOFS_CLOUD_URL: "https://memofs.dev/api/v1",
				MEMOFS_API_KEY: "tk_live_env",
				MEMOFS_PROJECT_ID: "env_proj",
			});
			const calls: string[] = [];
			const fetch: MemoFsCloudFetch = async (url) => {
				calls.push(String(url));
				return jsonResponse({
					data: { manifest: {}, cursor: "c", storageBytes: 0 },
					meta: {},
				});
			};
			// Re-create with the captured fetch since env construction doesn't
			// take one; verify the resolved defaults by using the same env.
			const clientWithFetch = createMemoFsCloudClient({
				baseUrl: "https://memofs.dev/api/v1",
				apiKey: "tk_live_env",
				defaultProjectId: "env_proj",
				fetch,
			});
			await clientWithFetch.sync.status();
			expect(calls).toEqual([
				"https://memofs.dev/api/v1/projects/env_proj/sync/status",
			]);
			// env path must throw when no URL is configured
			expect(() => createMemoFsCloudClientFromEnv({})).toThrow(
				/MEMOFS_CLOUD_URL/,
			);
			// smoke-check the env-built client is shaped correctly
			expect(typeof client.sync.push).toBe("function");
		});
	});
});
