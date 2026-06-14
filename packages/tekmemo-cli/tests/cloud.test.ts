import { afterEach, describe, expect, it, vi } from "vitest";
import { runTekMemoCli } from "../src";

describe("cloud commands", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("builds cloud context through project-scoped @tekbreed/tekmemo/cloud routes", async () => {
		const calls: string[] = [];
		const fetchMock = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input);
				calls.push(`${init?.method ?? "GET"} ${url}`);
				expect((init?.headers as Record<string, string>).Authorization).toBe(
					"Bearer tk_live_test_123",
				);
				if (url.endsWith("/memory/core")) {
					return new Response(
						JSON.stringify({
							data: {
								content: "# Core\n\nBilling webhooks verify signatures.",
							},
							meta: { requestId: "req_core" },
						}),
						{ status: 200, headers: { "content-type": "application/json" } },
					);
				}
				if (url.includes("/memory/notes")) {
					return new Response(
						JSON.stringify({
							data: {
								items: [
									{
										id: "note_1",
										kind: "decision",
										content: "Use Polar webhook signature verification.",
									},
								],
							},
							meta: { requestId: "req_notes" },
						}),
						{ status: 200, headers: { "content-type": "application/json" } },
					);
				}
				if (url.endsWith("/recall/query")) {
					expect(JSON.parse(String(init?.body))).toMatchObject({
						query: "billing",
						topK: 5,
					});
					return new Response(
						JSON.stringify({
							data: {
								items: [
									{
										id: "hit_1",
										text: "Billing webhooks verify signatures.",
										score: 0.95,
									},
								],
							},
							meta: { requestId: "req_recall" },
						}),
						{ status: 200, headers: { "content-type": "application/json" } },
					);
				}
				throw new Error(`Unexpected URL ${url}`);
			},
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await runTekMemoCli({
			argv: [
				"--json",
				"cloud",
				"--cloud-url",
				"https://memo.tekbreed.com/api/v1",
				"--api-key",
				"tk_live_test_123",
				"--workspace-id",
				"ws_123",
				"--project-id",
				"proj_123",
				"context",
				"--query",
				"billing",
				"--limit",
				"5",
			],
		});

		expect(result.exitCode).toBe(0);
		const parsed = JSON.parse(result.stdout.join("\n"));
		expect(parsed.ok).toBe(true);
		expect(parsed.command).toBe("cloud.context");
		expect(parsed.data.text).toContain("Billing webhooks");
		expect(calls).toEqual([
			"GET https://memo.tekbreed.com/api/v1/projects/proj_123/memory/core",
			"GET https://memo.tekbreed.com/api/v1/projects/proj_123/memory/notes?limit=5",
			"POST https://memo.tekbreed.com/api/v1/projects/proj_123/recall/query",
		]);
	});

	it("refuses cloud remember content that looks like a secret before sending request", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const result = await runTekMemoCli({
			argv: [
				"--json",
				"cloud",
				"--cloud-url",
				"https://memo.tekbreed.com/api/v1",
				"--api-key",
				"tk_live_test_123",
				"--project-id",
				"proj_123",
				"remember",
				"OPENAI_API_KEY=sk-123456789012345678901234",
			],
		});

		expect(result.exitCode).toBe(1);
		const parsed = JSON.parse(result.stdout.join("\n"));
		expect(parsed.ok).toBe(true);
		expect(parsed.data.stored).toBe(false);
		expect(parsed.data.secretFindings.length).toBeGreaterThan(0);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("pushes sync events through project-scoped sync API", async () => {
		const fetchMock = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				expect(String(input)).toBe(
					"https://memo.tekbreed.com/api/v1/projects/proj_123/sync/push",
				);
				expect(JSON.parse(String(init?.body))).toMatchObject({
					clientId: "cli_test",
					events: [{ clientEventId: "evt_local_1", type: "memory.write" }],
				});
				return new Response(
					JSON.stringify({
						data: {
							accepted: [
								{
									clientEventId: "evt_local_1",
									serverEventId: "srv_1",
									serverVersion: 1,
								},
							],
							duplicates: [],
							rejected: [],
							conflicts: [],
							serverVersion: 1,
						},
						meta: { requestId: "req_sync" },
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			},
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await runTekMemoCli({
			argv: [
				"--json",
				"cloud",
				"--cloud-url",
				"https://memo.tekbreed.com/api/v1",
				"--api-key",
				"tk_live_test_123",
				"--project-id",
				"proj_123",
				"sync",
				"push",
				"--client-id",
				"cli_test",
				"--events-json",
				JSON.stringify([
					{ clientEventId: "evt_local_1", type: "memory.write" },
				]),
			],
		});

		expect(result.exitCode).toBe(0);
		const parsed = JSON.parse(result.stdout.join("\n"));
		expect(parsed.data.serverVersion).toBe(1);
	});
});
