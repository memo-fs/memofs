import { describe, expect, it } from "vitest";
import {
	cloneForMutationCheck,
	expectNoMutation,
} from "../assertions/assertions";
import type {
	MinimalLlmClient,
	MinimalLlmCompletionInput,
	MinimalLlmCompletionResult,
} from "../types/contracts";

export interface LlmClientContractOptions {
	name: string;
	createClient: () => Promise<MinimalLlmClient> | MinimalLlmClient;
	cleanup?: () => Promise<void> | void;
	/**
	 * Whether the client honors an optional {@link MinimalLlmCompletionInput.schema}
	 * by returning a validated `structured` object. Set to `false` for adapters
	 * that only ever return free-form text; most should leave this `true`.
	 */
	supportsStructuredOutput?: boolean;
	/**
	 * Whether the client surfaces an adapter-declared `model` name on the
	 * result (for provenance / health reporting). Defaults to `true`.
	 */
	reportsModel?: boolean;
}

/**
 * Contract every {@link MinimalLlmClient} implementation must satisfy.
 *
 * Mirrors the embedder/reranker/extractor contract family: a stable name, a
 * `complete` call that resolves to a text result, input immutability, and the
 * optional structured-output (JSON-schema) seam. A new provider adapter (OpenAI
 * today, Anthropic/local later) passes this same suite.
 *
 * ## Defensive-parse obligation (per-adapter, not asserted here)
 *
 * Load-bearing for the deterministic-default fallback: malformed or empty
 * provider output **never throws** — it returns a text-only result so the
 * feature's deterministic path stays reachable. This suite cannot assert it generically because each provider fails
 * differently (a 500, a truncated stream, an unparseable JSON body); each
 * adapter MUST add its own provider-specific malformed-output test (the parity
 * the rule-based fallback depends on). The {@link FakeLlmClient} is the
 * reference: a failing resolver returns `{ text: "" }`, never throws (see
 * `tests/fakes.test.ts`).
 */
export function defineLlmClientContractTests(
	options: LlmClientContractOptions,
): void {
	describe(`${options.name} LlmClient contract`, () => {
		it("exposes a non-empty name and a complete function", async () => {
			const client = await options.createClient();
			try {
				expect(typeof client.name).toBe("string");
				expect(client.name.length).toBeGreaterThan(0);
				expect(typeof client.complete).toBe("function");
			} finally {
				await options.cleanup?.();
			}
		});

		it("complete resolves to a result with non-empty text", async () => {
			const client = await options.createClient();
			try {
				const result = await client.complete({
					system: "You rewrite search queries.",
					user: "how do I rotate logs",
				});
				expect(isValidResult(result)).toBe(true);
				expect(result.text.length).toBeGreaterThan(0);
			} finally {
				await options.cleanup?.();
			}
		});

		it("completes with only a user turn when system is omitted", async () => {
			const client = await options.createClient();
			try {
				const result = await client.complete({
					user: "Score these two facts for consistency.",
				});
				expect(typeof result.text).toBe("string");
				expect(result.text.length).toBeGreaterThan(0);
			} finally {
				await options.cleanup?.();
			}
		});

		it("does not mutate the caller-owned input", async () => {
			const client = await options.createClient();
			try {
				const input: MinimalLlmCompletionInput = {
					system: "You rewrite queries.",
					user: "logs rotation",
				};
				const before = cloneForMutationCheck(input);
				await client.complete(input);
				expectNoMutation(before, input);
			} finally {
				await options.cleanup?.();
			}
		});

		if (options.supportsStructuredOutput ?? true) {
			it("returns a structured object when a schema is requested", async () => {
				const client = await options.createClient();
				try {
					const result = await client.complete({
						system: "Return JSON matching the schema.",
						user: "rewrite: how do I rotate logs",
						schema: {
							type: "object",
							properties: {
								query: { type: "string" },
							},
							required: ["query"],
						},
					});
					expect(result.structured).toBeDefined();
					expect(typeof result.structured).toBe("object");
					expect(result.structured).not.toBeNull();
					// Text stays present even when structured is returned, so a
					// caller that wants text never has to branch.
					expect(typeof result.text).toBe("string");
				} finally {
					await options.cleanup?.();
				}
			});
		}

		if (options.reportsModel ?? true) {
			it("surfaces an adapter-declared model name", async () => {
				const client = await options.createClient();
				try {
					const result = await client.complete({ user: "any prompt" });
					expect(typeof result.model).toBe("string");
					expect(result.model?.length).toBeGreaterThan(0);
				} finally {
					await options.cleanup?.();
				}
			});
		}
	});
}

/** Structural check that a value is a valid {@link MinimalLlmCompletionResult}. */
function isValidResult(value: unknown): value is MinimalLlmCompletionResult {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	return typeof v.text === "string";
}
