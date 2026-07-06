import type {
	MinimalLlmClient,
	MinimalLlmCompletionInput,
	MinimalLlmCompletionResult,
} from "../types/contracts";

/**
 * Deterministic in-memory `LlmClient` for tests.
 *
 * Mirrors the embedder/reranker/extractor fake family: a stand-in for an
 * LLM-backed client in consumer tests that don't want to pay for live network
 * calls. Doubles as the reference implementation for the {@link MinimalLlmClient}
 * contract suite. Records every `complete` call so a test can assert what the
 * feature under test sent to the LLM seam, and honors the `schema` request by
 * returning a `structured` object (defensive-parse parity: a thrown/malformed
 * resolver never escapes — it surfaces as a text-only result, matching the
 * contract every real adapter must satisfy).
 *
 * @see {@link MinimalLlmClient} — the contract this satisfies.
 */
export class FakeLlmClient implements MinimalLlmClient {
	readonly name = "fake-llm-client";
	readonly calls: MinimalLlmCompletionInput[] = [];

	private readonly resolveText: (input: MinimalLlmCompletionInput) => string;
	private readonly model: string;

	constructor(options?: {
		/**
		 * Maps a completion input to its response text. Defaults to echoing the
		 * user turn (deterministic + observable). Pass a custom resolver to
		 * simulate provider-specific behavior (rewrites, scoring, merges). If the
		 * resolver throws, the fake surfaces a text-only empty result rather than
		 * propagating — the defensive-parse contract real adapters follow.
		 */
		resolveText?: (input: MinimalLlmCompletionInput) => string;
		/** Adapter-declared model name surfaced on results. Defaults to `"fake-llm-client"`. */
		model?: string;
	}) {
		this.resolveText = options?.resolveText ?? ((input) => input.user);
		this.model = options?.model ?? "fake-llm-client";
	}

	async complete(
		input: MinimalLlmCompletionInput,
	): Promise<MinimalLlmCompletionResult> {
		// Defensive copy so the caller's input shape can't be mutated by reference.
		this.calls.push({
			user: input.user,
			...(input.system === undefined ? {} : { system: input.system }),
			...(input.schema === undefined ? {} : { schema: input.schema }),
			...(input.mode === undefined ? {} : { mode: input.mode }),
		});

		// Defensive-parse parity: a resolver that throws never escapes. The real
		// adapter contract is "malformed LLM output → text-only result, never a
		// throw"; the fake models the same so the deterministic fallback stays
		// reachable in tests that exercise the error path.
		let text: string;
		try {
			text = this.resolveText(input);
		} catch {
			return { text: "", model: this.model };
		}

		// When a schema is requested, attempt to surface a structured object. The
		// fake parses the response as JSON when it can; otherwise it returns the
		// text only (the same graceful degradation a real adapter uses).
		const structured = parseStructured(text, input.schema);

		return {
			text,
			...(structured === undefined ? {} : { structured }),
			model: this.model,
		};
	}
}

export function createFakeLlmClient(options?: {
	resolveText?: (input: MinimalLlmCompletionInput) => string;
	model?: string;
}): FakeLlmClient {
	return new FakeLlmClient(options);
}

/**
 * Parses a structured object out of the response when a schema was requested.
 *
 * The fake does not validate against the schema (no schema-lib dependency); it
 * only surfaces a `structured` object when the text parses as a JSON object, so
 * the contract suite's structured-output assertion holds. A real adapter
 * validates against the schema; this fake models the seam, not the validation.
 */
function parseStructured(
	text: string,
	schema: MinimalLlmCompletionInput["schema"],
): Record<string, unknown> | undefined {
	if (schema === undefined) return undefined;
	const trimmed = text.trim();
	if (trimmed.length === 0) return undefined;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			!Array.isArray(parsed)
		) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		// Not JSON — surface text only (graceful degradation, as designed).
	}
	return undefined;
}
