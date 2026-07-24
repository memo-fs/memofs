/**
 * OpenAI MSW handler — intercepts api.openai.com/v1/embeddings returning sanitized 384-dim fixtures.
 *
 * - RUN_ID tracing, secret redacted to test-token-***
 * - Deterministic embedding generation so any input length works
 * - Error case that redacts token in message proof
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { HttpResponse, http } from "msw";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixturePath = join(__dirname, "..", "fixtures", "openai", "embed.json");

type OpenAIFixtureFile = {
	runId: string;
	sanitized: boolean;
	secretRedacted: string;
	payload: {
		object: string;
		data: { object: string; embedding: number[]; index: number }[];
		model: string;
		usage: { prompt_tokens: number; total_tokens: number };
	};
};

function loadOriginal(): OpenAIFixtureFile | null {
	try {
		const raw = readFileSync(fixturePath, "utf8");
		return JSON.parse(raw) as OpenAIFixtureFile;
	} catch {
		return null;
	}
}

const original = loadOriginal();

/** Deterministic 384-dim (or requested dim) embedding. */
function generateEmbedding(dim: number, seed: number): number[] {
	const out: number[] = new Array(dim);
	for (let i = 0; i < dim; i++) {
		const v =
			Math.sin(i * 0.13 + seed * 0.7) * 0.5 + Math.cos(i * 0.07 + seed) * 0.3;
		out[i] = Math.round(v * 1e6) / 1e6;
	}
	return out;
}

/**
 * Get OpenAI fixture meta (RUN_ID, redacted).
 * @returns meta or null if fixture missing.
 */
export function getOpenAIFixtureMeta(): {
	runId: string;
	secretRedacted: string;
	sanitized: boolean;
} | null {
	if (!original) return null;
	return {
		runId: original.runId,
		secretRedacted: original.secretRedacted,
		sanitized: original.sanitized,
	};
}

/**
 * Mutable flag to simulate error that would leak token if not redacted.
 * When set, handler returns 401 with a message that in real world might contain token,
 * but we redact to prove error messages don't leak token.
 */
let forceError = false;
let forceErrorMessage = "Invalid API key (redacted)";

/**
 * Enable/disable error mode that returns 401 with redacted message (for token-leak proof).
 * @param enabled - Whether to force error.
 * @param message - Redacted error message.
 */
export function setOpenAIErrorMode(
	enabled: boolean,
	message = "Invalid API key (redacted)",
): void {
	forceError = enabled;
	forceErrorMessage = message;
}

/** Reset OpenAI fixture error mode. */
export function resetOpenAIFixture(): void {
	forceError = false;
	forceErrorMessage = "Invalid API key (redacted)";
}

/** MSW handlers for OpenAI embeddings — returns sanitized 384-dim fixtures with RUN_ID and redacted secret. */
export const openaiHandlers = [
	// Exact OpenAI endpoints — SDK may request /v1/embeddings or /embeddings depending on baseUrl normalization
	http.post("https://api.openai.com/v1/embeddings", async ({ request }) => {
		if (forceError) {
			return HttpResponse.json(
				{
					error: {
						message: forceErrorMessage,
						type: "invalid_request_error",
						code: "invalid_api_key",
					},
				},
				{ status: 401 },
			);
		}

		// Never echo Authorization
		const auth = request.headers.get("authorization");
		if (!auth) {
			// Still allow for test — don't require auth for MSW to prove deterministic
			// but if present we redact and don't log.
		}

		let body: {
			input?: string | string[];
			model?: string;
			dimensions?: number;
			encoding_format?: string;
		} = {};
		try {
			body = (await request.clone().json()) as typeof body;
		} catch {
			// ignore
		}

		const inputs: string[] = Array.isArray(body.input)
			? body.input
			: typeof body.input === "string"
				? [body.input]
				: [];

		// Determine dimension — respect requested dimensions, default 384 for e2e fixture proof
		const requestedDim =
			typeof body.dimensions === "number" ? body.dimensions : 384;

		// If fixture exists and inputs length matches cached data, reuse to keep file truth proof,
		// otherwise generate deterministic.
		let data: { object: string; embedding: number[]; index: number }[];
		if (
			original &&
			inputs.length > 0 &&
			inputs.length <= original.payload.data.length &&
			requestedDim === 384 &&
			original.payload.data[0]?.embedding.length === 384
		) {
			// Use first N from fixture for determinism proof (fixture file usage)
			data = original.payload.data.slice(0, inputs.length).map((d, i) => ({
				object: "embedding",
				embedding: d.embedding.slice(0, requestedDim),
				index: i,
			}));
		} else {
			data = inputs.map((_, i) => ({
				object: "embedding",
				embedding: generateEmbedding(requestedDim, i + 1),
				index: i,
			}));
		}

		// If input empty array from client? OpenAI client batches, but handle zero case.
		if (inputs.length === 0 && data.length === 0) {
			// For empty input, contract expects empty result earlier (validation), but if called still return empty list.
			return HttpResponse.json({
				object: "list",
				data: [],
				model: body.model ?? "text-embedding-3-small",
				usage: { prompt_tokens: 0, total_tokens: 0 },
			});
		}

		return HttpResponse.json({
			object: "list",
			data,
			model: body.model ?? original?.payload.model ?? "text-embedding-3-small",
			usage: {
				prompt_tokens: inputs.length * 6,
				total_tokens: inputs.length * 6,
			},
		});
	}),

	// OpenAI SDK sometimes uses https://api.openai.com/embeddings (without /v1) when baseUrl is https://api.openai.com
	http.post("https://api.openai.com/embeddings", async ({ request }) => {
		if (forceError) {
			return HttpResponse.json(
				{
					error: {
						message: forceErrorMessage,
						type: "invalid_request_error",
						code: "invalid_api_key",
					},
				},
				{ status: 401 },
			);
		}
		let body: {
			input?: string | string[];
			model?: string;
			dimensions?: number;
		} = {};
		try {
			body = (await request.clone().json()) as typeof body;
		} catch {}
		const inputs: string[] = Array.isArray(body.input)
			? body.input
			: typeof body.input === "string"
				? [body.input]
				: [];
		const requestedDim =
			typeof body.dimensions === "number" ? body.dimensions : 384;
		let data: { object: string; embedding: number[]; index: number }[];
		if (
			original &&
			inputs.length > 0 &&
			inputs.length <= original.payload.data.length &&
			requestedDim === 384
		) {
			data = original.payload.data.slice(0, inputs.length).map((d, i) => ({
				object: "embedding",
				embedding: d.embedding.slice(0, requestedDim),
				index: i,
			}));
		} else {
			data = inputs.map((_, i) => ({
				object: "embedding",
				embedding: generateEmbedding(requestedDim, i + 1),
				index: i,
			}));
		}
		if (inputs.length === 0) {
			return HttpResponse.json({
				object: "list",
				data: [],
				model: body.model ?? "text-embedding-3-small",
				usage: { prompt_tokens: 0, total_tokens: 0 },
			});
		}
		return HttpResponse.json({
			object: "list",
			data,
			model: body.model ?? original?.payload.model ?? "text-embedding-3-small",
			usage: {
				prompt_tokens: inputs.length * 6,
				total_tokens: inputs.length * 6,
			},
		});
	}),

	// Catch-all for custom baseUrl overrides — matches any host's /embeddings (including /v1/embeddings)
	http.post(/\/embeddings$/, async ({ request }) => {
		// If already handled by exact above, this is fallback for custom baseUrl.
		// Check if request has OpenAI-style auth to avoid colliding with Voyage (which also uses /v1/embeddings)
		const auth = request.headers.get("authorization") ?? "";
		const isOpenAI =
			auth.toLowerCase().includes("bearer") &&
			!request.url.includes("voyageai.com");
		// We can't reliably distinguish, so only handle if not voyage url and url not already matched.
		// If it's voyage, let voyage handler handle.
		if (request.url.includes("voyageai.com")) {
			return; // passthrough to voyage handler
		}
		if (!isOpenAI && !request.url.includes("openai.com")) {
			// Might still be OpenAI custom base — if Content-Type json and body has model with text-embedding, treat as openai
			// To be safe, return undefined to allow next handler.
			// However we already generated above for openai.com; for custom, generate similarly.
		}

		if (forceError) {
			return HttpResponse.json(
				{
					error: {
						message: forceErrorMessage,
						type: "invalid_request_error",
						code: "invalid_api_key",
					},
				},
				{ status: 401 },
			);
		}

		let body: {
			input?: string | string[];
			model?: string;
			dimensions?: number;
		} = {};
		try {
			body = (await request.clone().json()) as typeof body;
		} catch {}

		const inputs: string[] = Array.isArray(body.input)
			? body.input
			: typeof body.input === "string"
				? [body.input]
				: [];

		const requestedDim =
			typeof body.dimensions === "number" ? body.dimensions : 384;

		const data = inputs.map((_, i) => ({
			object: "embedding",
			embedding: generateEmbedding(requestedDim, i + 100),
			index: i,
		}));

		if (inputs.length === 0) {
			return HttpResponse.json({
				object: "list",
				data: [],
				model: body.model ?? "text-embedding-3-small",
				usage: { prompt_tokens: 0, total_tokens: 0 },
			});
		}

		return HttpResponse.json({
			object: "list",
			data,
			model: body.model ?? "text-embedding-3-small",
			usage: {
				prompt_tokens: inputs.length * 6,
				total_tokens: inputs.length * 6,
			},
		});
	}),
];
