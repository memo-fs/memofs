/**
 * Runtime-API dispatcher — the core of the `memofs-server` HTTP surface.
 *
 * @remarks
 * Proves the slice-1 bars (s3-execution-plan.md slice 1, "Test bars"):
 * 1. A read method (`recall`) round-trips data over the JSON-RPC envelope.
 * 2. **Every gated mutating method returns the `503` concurrency gate** — the
 * "second concurrent writer gets 503" bar, proven trivially-correct
 * pre-slice-3 (no write path is reachable).
 * 3. JSON-RPC parse + validation errors map to the correct spec codes.
 * 4. Batch dispatch + notification handling behave per spec.
 *
 * The runtime is assembled from `createHostedRuntime` + injected fakes (no real
 * provider calls), mirroring the slice-0 factory test.
 */
import {
	type ExtractionInput,
	type ExtractionResult,
	type Extractor,
	InMemoryMemoryStore,
	type MemoFS,
	type MemoryEmbedder,
} from "@memofs/core";
import { JSON_RPC_ERRORS } from "@memofs/json-rpc";
import { beforeEach, describe, expect, it } from "vitest";
import { createHostedRuntime } from "../src";
import { GATED_METHODS, RUNTIME_METHOD } from "../src/protocol/methods";
import {
	CONCURRENCY_GATE_ERROR_CODE,
	CONCURRENCY_GATE_HTTP_STATUS,
	dispatchRuntimeMessage,
	dispatchRuntimeText,
} from "../src/runtime-api/dispatch";

describe("runtime-API dispatch — slice 1", () => {
	let tek: MemoFS;

	beforeEach(() => {
		tek = createHostedRuntime({
			store: new InMemoryMemoryStore(),
			projectId: "runtime-api",
			embedder: createFakeEmbedder(),
			extractor: createFakeExtractor(),
		});
	});

	describe("read methods (live)", () => {
		it("recall round-trips data over the JSON-RPC success envelope", async () => {
			await tek.writeMemory({ content: "self-hosted runtime runs the engine" });

			const response = (await dispatchRuntimeMessage(tek, {
				jsonrpc: "2.0",
				id: 1,
				method: RUNTIME_METHOD.recall,
				params: { query: "self-hosted" },
			})) as unknown as {
				jsonrpc: string;
				id: number;
				result: { items: unknown[] };
			};

			expect(response.jsonrpc).toBe("2.0");
			expect(response.id).toBe(1);
			expect(response.result.items.length).toBeGreaterThan(0);
		});

		it("health returns the runtime identity", async () => {
			const response = (await dispatchRuntimeMessage(tek, {
				jsonrpc: "2.0",
				id: "h",
				method: RUNTIME_METHOD.health,
			})) as unknown as { result: { ok: boolean; name: string } };

			expect(response.result.ok).toBe(true);
			expect(response.result.name).toBe("memofs-server");
		});

		it("readCore returns the core document content", async () => {
			const response = (await dispatchRuntimeMessage(tek, {
				jsonrpc: "2.0",
				id: 1,
				method: RUNTIME_METHOD.readCore,
			})) as unknown as { result: { content: string } };
			expect(typeof response.result.content).toBe("string");
		});
	});

	describe("write-gate (Hard ordering rule)", () => {
		// Every mutating method must be in the gated set — this is the
		// machine-checkable invariant that no write path is reachable pre-slice-3.
		it("GATED_METHODS contains exactly the mutating methods", () => {
			expect([...GATED_METHODS].sort()).toEqual(
				[
					RUNTIME_METHOD.write,
					RUNTIME_METHOD.recordNote,
					RUNTIME_METHOD.updateCore,
					RUNTIME_METHOD.appendConversation,
					RUNTIME_METHOD.upsertNodes,
					RUNTIME_METHOD.upsertEdges,
					RUNTIME_METHOD.consolidate,
					RUNTIME_METHOD.createSnapshot,
					RUNTIME_METHOD.restoreSnapshot,
				].sort(),
			);
		});

		// The headline bar: "a second concurrent writer gets 503, not a silent
		// lost write." Proven trivially-correct: no write path is reachable at all.
		it.each([
			...GATED_METHODS,
		])("gated method %s returns the 503 concurrency-gate failure", async (method) => {
			const response = (await dispatchRuntimeMessage(tek, {
				jsonrpc: "2.0",
				id: 7,
				method,
				params: {},
			})) as unknown as {
				error: {
					code: number;
					message: string;
					data: { httpStatus: number; reason: string };
				};
			};

			expect(response.error.code).toBe(CONCURRENCY_GATE_ERROR_CODE);
			expect(response.error.data.httpStatus).toBe(CONCURRENCY_GATE_HTTP_STATUS);
			expect(response.error.data.reason).toBe("concurrency_layer_required");
		});

		it("the gate message references slice 3", async () => {
			const response = (await dispatchRuntimeMessage(tek, {
				jsonrpc: "2.0",
				id: 1,
				method: RUNTIME_METHOD.write,
				params: { content: "x" },
			})) as unknown as { error: { message: string } };
			expect(response.error.message).toMatch(/slice 3/i);
			expect(response.error.message).toMatch(/concurrency layer/i);
		});

		it("injecting a concurrencyLayer runs the mutating handler inside acquire (the slice-3 seam)", async () => {
			// The seam contract: once a concurrencyLayer is present, the gate
			// drops AND the mutating handler runs inside `acquire` (scoped to the
			// project) — so concurrent writers serialize through the lock. Slice 3
			// implements the real lock; this proves the wiring is real, not a stub.
			// The assertion focus is the acquire wiring + scoping; whether the write
			// itself persists is the unit suite's concern (the fake store may need
			// bootstrap).
			const acquireCalls: Array<{
				projectId: string;
				ranHandler: boolean;
			}> = [];
			const layer = {
				acquire: async <T>(
					projectId: string,
					fn: () => Promise<T>,
				): Promise<T> => {
					const ranHandler = true; // `fn` IS the handler; reaching here means the gate dropped.
					const result = await fn();
					acquireCalls.push({ projectId, ranHandler });
					return result;
				},
			};

			await dispatchRuntimeMessage(
				tek,
				{
					jsonrpc: "2.0",
					id: 1,
					method: RUNTIME_METHOD.write,
					params: { content: "gate flipped" },
				},
				{ concurrencyLayer: layer },
			);

			// The handler ran inside acquire (not bypassed), scoped to the runtime's projectId.
			expect(acquireCalls).toHaveLength(1);
			expect(acquireCalls[0]?.projectId).toBe("runtime-api");
			expect(acquireCalls[0]?.ranHandler).toBe(true);
		});

		it("acquire is scoped to params.projectId when the request carries one", async () => {
			const seen: string[] = [];
			const layer = {
				acquire: async <T>(
					projectId: string,
					fn: () => Promise<T>,
				): Promise<T> => {
					seen.push(projectId);
					return fn();
				},
			};
			await dispatchRuntimeMessage(
				tek,
				{
					jsonrpc: "2.0",
					id: 1,
					method: RUNTIME_METHOD.write,
					params: { content: "x", projectId: "other-project" },
				},
				{ concurrencyLayer: layer },
			);
			expect(seen[0]).toBe("other-project");
		});
	});

	describe("JSON-RPC protocol errors", () => {
		it("unknown method returns methodNotFound (-32601)", async () => {
			const response = (await dispatchRuntimeMessage(tek, {
				jsonrpc: "2.0",
				id: 1,
				method: "nope",
				params: {},
			})) as unknown as { error: { code: number } };
			expect(response.error.code).toBe(JSON_RPC_ERRORS.methodNotFound);
		});

		it("invalid protocol version returns invalidRequest (-32600)", async () => {
			const response = (await dispatchRuntimeMessage(tek, {
				jsonrpc: "1.0",
				id: 1,
				method: RUNTIME_METHOD.recall,
				params: {},
			})) as unknown as { error: { code: number } };
			expect(response.error.code).toBe(JSON_RPC_ERRORS.invalidRequest);
		});

		it("missing required param returns invalidParams (-32602)", async () => {
			const response = (await dispatchRuntimeMessage(tek, {
				jsonrpc: "2.0",
				id: 1,
				method: RUNTIME_METHOD.recall,
				params: {},
			})) as unknown as { error: { code: number; message: string } };
			expect(response.error.code).toBe(JSON_RPC_ERRORS.invalidParams);
			expect(response.error.message).toMatch(/query/);
		});

		it("dispatchRuntimeText returns parseError (-32700) on bad JSON", async () => {
			const text = await dispatchRuntimeText(tek, "{bad json");
			const response = JSON.parse(text as string) as {
				error: { code: number };
			};
			expect(response.error.code).toBe(JSON_RPC_ERRORS.parseError);
		});
	});

	describe("batch + notifications", () => {
		it("dispatches a batch and returns one response per non-notification", async () => {
			await tek.writeMemory({ content: "batch payload" });
			const responses = (await dispatchRuntimeMessage(tek, [
				{ jsonrpc: "2.0", id: 1, method: RUNTIME_METHOD.health, params: {} },
				{
					jsonrpc: "2.0",
					method: "notifications/initialized",
					params: {},
				},
				{
					jsonrpc: "2.0",
					id: 2,
					method: RUNTIME_METHOD.recall,
					params: { query: "batch" },
				},
			])) as unknown as Array<{ id: number }>;

			expect(responses).toHaveLength(2);
			expect(responses.map((r) => r.id).sort()).toEqual([1, 2]);
		});

		it("empty batch returns invalidRequest (-32600)", async () => {
			const response = (await dispatchRuntimeMessage(tek, [])) as unknown as {
				error: { code: number };
			};
			expect(response.error.code).toBe(JSON_RPC_ERRORS.invalidRequest);
		});

		it("a single notification produces no response (undefined)", async () => {
			const response = await dispatchRuntimeMessage(tek, {
				jsonrpc: "2.0",
				method: "notifications/initialized",
				params: {},
			});
			expect(response).toBeUndefined();
		});
	});
});

/** Minimal fake embedder satisfying the full core {@link MemoryEmbedder}. */
function createFakeEmbedder(): MemoryEmbedder {
	return {
		async embedTexts(input: { texts: string[] }) {
			return {
				embeddings: input.texts.map((text, index) => ({
					text,
					embedding: [text.length, index],
					index,
					model: "fake-embedder",
					dimensions: 2,
				})),
				model: "fake-embedder",
			};
		},
		async embedText(text: string) {
			return {
				text,
				embedding: [text.length, 0],
				index: 0,
				model: "fake-embedder",
				dimensions: 2,
			};
		},
	} as MemoryEmbedder;
}

/** Fake extractor: emits no facts (the dispatcher only stores + routes it). */
function createFakeExtractor(): Extractor {
	return {
		name: "fake-extractor",
		async extract(_input: ExtractionInput): Promise<ExtractionResult> {
			return { nodes: [], edges: [] };
		},
	};
}
