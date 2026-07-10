import { MEMOFS_PATHS, type MemoryPath } from "@memofs/core";
import {
	createNodeFsMemoryStore,
	createTempMemoFsDir,
} from "@memofs/core/node-fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runMemoFsCli } from "../src";

describe("cloud commands", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reads cloud sync status (manifest, cursor, storage) through project-scoped sync API", async () => {
		const calls: string[] = [];
		const fetchMock = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input);
				calls.push(`${init?.method ?? "GET"} ${url}`);
				expect((init?.headers as Record<string, string>).Authorization).toBe(
					"Bearer tm_test_123",
				);
				expect(url).toBe(
					"https://memofs.dev/api/v1/projects/proj_123/sync/status",
				);
				return new Response(
					JSON.stringify({
						data: {
							manifest: {
								".memofs/memory/core.md": {
									path: ".memofs/memory/core.md",
									sha256: "a".repeat(64),
									sizeBytes: 42,
								},
							},
							cursor: "cursor_1",
							storageBytes: 2048,
							lastSyncAt: "2026-06-19T00:00:00.000Z",
						},
						meta: { requestId: "req_status" },
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			},
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await runMemoFsCli({
			argv: [
				"--json",
				"cloud",
				"--cloud-url",
				"https://memofs.dev/api/v1",
				"--api-key",
				"tm_test_123",
				"--project-id",
				"proj_123",
				"sync",
				"status",
			],
		});

		expect(result.exitCode).toBe(0);
		const parsed = JSON.parse(result.stdout.join("\n"));
		expect(parsed.ok).toBe(true);
		expect(parsed.command).toBe("cloud.sync.status");
		expect(parsed.data.cursor).toBe("cursor_1");
		expect(parsed.data.storageBytes).toBe(2048);
		expect(calls).toEqual([
			"GET https://memofs.dev/api/v1/projects/proj_123/sync/status",
		]);
	});

	it("runs the two-phase push (push -> upload -> complete) against project-scoped sync API", async () => {
		const temp = await createTempMemoFsDir();
		try {
			// Seed a canonical file so the local manifest is non-empty.
			const { MemoFS } = await import("@memofs/core");
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir: temp.rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir: temp.rootDir,
				autoBootstrap: false,
			});
			await memo.store.write(
				MEMOFS_PATHS.memory.core as MemoryPath,
				"# Core\n\nTwo-phase push smoke test.",
			);

			const calls: string[] = [];
			const fetchMock = vi.fn(
				async (input: RequestInfo | URL, init?: RequestInit) => {
					const url = String(input);
					calls.push(`${init?.method ?? "GET"} ${url}`);
					expect((init?.headers as Record<string, string>).Authorization).toBe(
						"Bearer tm_test_123",
					);

					if (url.endsWith("/sync/push")) {
						// Phase 1: server returns presigned upload URLs for changed files.
						const body = JSON.parse(String(init?.body));
						expect(body.baseCursor).toBe("cursor_prev");
						// The manifest must include the seeded core file, keyed by path.
						expect(body.manifest).toHaveProperty(".memofs/memory/core.md");
						return new Response(
							JSON.stringify({
								data: {
									upload: [
										{
											path: ".memofs/memory/core.md",
											sha256: body.manifest[".memofs/memory/core.md"],
											sizeBytes: 37,
											presignedPutUrl:
												"https://r2.example.com/put/core.md?sig=abc",
										},
									],
									cursor: "cursor_push",
								},
								meta: { requestId: "req_push" },
							}),
							{
								status: 200,
								headers: { "content-type": "application/json" },
							},
						);
					}

					if (url.endsWith("/sync/push/complete")) {
						// Phase 3: server commits the manifest update.
						const body = JSON.parse(String(init?.body));
						expect(body.cursor).toBe("cursor_push");
						expect(body.uploaded).toHaveLength(1);
						expect(body.uploaded[0]).toMatchObject({
							path: ".memofs/memory/core.md",
						});
						return new Response(
							JSON.stringify({
								data: {
									cursor: "cursor_complete",
									manifest: {
										".memofs/memory/core.md": {
											path: ".memofs/memory/core.md",
											sha256: body.uploaded[0].sha256,
											sizeBytes: 37,
											r2Key: "projects/proj_123/core.md",
											updatedAt: "2026-06-19T00:00:00.000Z",
										},
									},
								},
								meta: { requestId: "req_complete" },
							}),
							{
								status: 200,
								headers: { "content-type": "application/json" },
							},
						);
					}

					throw new Error(`Unexpected URL ${url}`);
				},
			);
			vi.stubGlobal("fetch", fetchMock);

			const result = await runMemoFsCli({
				argv: [
					"--json",
					"--root",
					temp.rootDir,
					"cloud",
					"--cloud-url",
					"https://memofs.dev/api/v1",
					"--api-key",
					"tm_test_123",
					"--project-id",
					"proj_123",
					"sync",
					"push",
					"--base-cursor",
					"cursor_prev",
				],
			});

			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.command).toBe("cloud.sync.push");
			expect(parsed.data.upload).toHaveLength(1);
			expect(parsed.data.complete.cursor).toBe("cursor_complete");
			// Both phases of the two-phase push must hit the project-scoped sync API.
			expect(calls).toEqual([
				"POST https://memofs.dev/api/v1/projects/proj_123/sync/push",
				"POST https://memofs.dev/api/v1/projects/proj_123/sync/push/complete",
			]);
		} finally {
			await temp.cleanup();
		}
	});
});
