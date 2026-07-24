/**
 * Voyage MSW handler — intercepts api.voyageai.com/v1/embeddings and /v1/rerank returning sanitized fixtures.
 *
 * - RUN_ID tracing, secret redacted to test-token-***
 * - Deterministic 384-dim generation for embed (contract expects 384, we support 384 via expectedDimensions)
 * - Rerank fixture
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { http, HttpResponse } from "msw";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const embedFixturePath = join(__dirname, "..", "fixtures", "voyage", "embed.json");
const rerankFixturePath = join(__dirname, "..", "fixtures", "voyage", "rerank.json");

type VoyageEmbedFixtureFile = {
	runId: string;
	sanitized: boolean;
	secretRedacted: string;
	payload: {
		object: string;
		data: { object: string; embedding: number[]; index: number }[];
		model: string;
		usage: { total_tokens: number };
	};
};

type VoyageRerankFixtureFile = {
	runId: string;
	sanitized: boolean;
	secretRedacted: string;
	payload: {
		object: string;
		data: { index: number; relevance_score: number; document?: string }[];
		model: string;
		usage: { total_tokens: number };
	};
};

function loadEmbed(): VoyageEmbedFixtureFile | null {
	try {
		return JSON.parse(readFileSync(embedFixturePath, "utf8")) as VoyageEmbedFixtureFile;
	} catch {
		return null;
	}
}

function loadRerank(): VoyageRerankFixtureFile | null {
	try {
		return JSON.parse(readFileSync(rerankFixturePath, "utf8")) as VoyageRerankFixtureFile;
	} catch {
		return null;
	}
}

const originalEmbed = loadEmbed();
const originalRerank = loadRerank();

function generateEmbedding(dim: number, seed: number): number[] {
	const out: number[] = new Array(dim);
	for (let i = 0; i < dim; i++) {
		const v = Math.sin(i * 0.13 + seed * 0.7) * 0.5 + Math.cos(i * 0.07 + seed) * 0.3;
		out[i] = Math.round(v * 1e6) / 1e6;
	}
	return out;
}

/**
 * Get Voyage fixture meta (RUN_ID, redacted).
 * @returns meta
 */
export function getVoyageFixtureMeta(): {
	embedRunId: string | undefined;
	rerankRunId: string | undefined;
	secretRedacted: string | undefined;
} {
	return {
		embedRunId: originalEmbed?.runId,
		rerankRunId: originalRerank?.runId,
		secretRedacted: originalEmbed?.secretRedacted ?? originalRerank?.secretRedacted,
	};
}

let forceEmbedError = false;
let forceRerankError = false;

/**
 * Enable/disable Voyage error mode for embed/rerank.
 * @param opts - Which endpoint to force error.
 */
export function setVoyageErrorMode(opts: { embed?: boolean; rerank?: boolean }): void {
	forceEmbedError = opts.embed ?? false;
	forceRerankError = opts.rerank ?? false;
}

/** Reset Voyage fixture error mode. */
export function resetVoyageFixture(): void {
	forceEmbedError = false;
	forceRerankError = false;
}

/** MSW handlers for Voyage — embeddings + rerank returning sanitized fixtures with RUN_ID and redacted secret. */
export const voyageHandlers = [
	http.post("https://api.voyageai.com/v1/embeddings", async ({ request }) => {
		if (forceEmbedError) {
			return HttpResponse.json(
				{
					error: { message: "Invalid API key (redacted)", code: "invalid_api_key" },
				},
				{ status: 401 },
			);
		}

		let body: {
			input?: string[];
			model?: string;
			output_dimension?: number;
		} = {};
		try {
			body = (await request.clone().json()) as typeof body;
		} catch {}

		const inputs = Array.isArray(body.input) ? body.input : [];

		// Determine dimension: if output_dimension requested, respect it; else 384 for e2e proof
		// Voyage flexible dims are 256,512,1024,2048 but we allow 384 for contract proof when output_dimension not set.
		const requestedDim = typeof body.output_dimension === "number" ? body.output_dimension : 384;

		let data: { object: string; embedding: number[]; index: number }[];
		if (
			originalEmbed &&
			inputs.length > 0 &&
			inputs.length <= originalEmbed.payload.data.length &&
			requestedDim === 384
		) {
			data = originalEmbed.payload.data.slice(0, inputs.length).map((d, i) => ({
				object: "embedding",
				embedding: d.embedding.slice(0, requestedDim),
				index: i,
			}));
		} else {
			data = inputs.map((_, i) => ({
				object: "embedding",
				embedding: generateEmbedding(requestedDim, i + 10),
				index: i,
			}));
		}

		if (inputs.length === 0) {
			return HttpResponse.json({
				object: "list",
				data: [],
				model: body.model ?? originalEmbed?.payload.model ?? "voyage-4-lite",
				usage: { total_tokens: 0 },
			});
		}

		return HttpResponse.json({
			object: "list",
			data,
			model: body.model ?? originalEmbed?.payload.model ?? "voyage-4-lite",
			usage: { total_tokens: inputs.length * 6 },
		});
	}),

	http.post("https://api.voyageai.com/v1/rerank", async ({ request }) => {
		if (forceRerankError) {
			return HttpResponse.json(
				{ error: { message: "Rerank failed (redacted)", code: "invalid_request" } },
				{ status: 400 },
			);
		}

		let body: { query?: string; documents?: string[]; model?: string; top_k?: number } = {};
		try {
			body = (await request.clone().json()) as typeof body;
		} catch {}

		const docs = Array.isArray(body.documents) ? body.documents : [];
		const topK = typeof body.top_k === "number" ? body.top_k : docs.length;

		if (originalRerank && docs.length <= originalRerank.payload.data.length) {
			// Use fixture slice
			const data = originalRerank.payload.data.slice(0, topK).map((d) => ({
				index: d.index,
				relevance_score: d.relevance_score,
				document: d.document,
			}));
			return HttpResponse.json({
				object: "list",
				data,
				model: body.model ?? originalRerank.payload.model,
				usage: { total_tokens: docs.length * 10 },
			});
		}

		// Generate deterministic rerank scores descending
		const data = docs.slice(0, topK).map((doc, i) => ({
			index: i,
			relevance_score: Math.round((1 - i * 0.1) * 100) / 100,
			document: doc,
		}));

		return HttpResponse.json({
			object: "list",
			data,
			model: body.model ?? "rerank-2",
			usage: { total_tokens: docs.length * 10 },
		});
	}),

	// Fallback for custom baseUrl containing voyageai.com path
	http.post(/voyageai\.com\/v1\/embeddings$/, async ({ request }) => {
		if (forceEmbedError) {
			return HttpResponse.json({ error: { message: "Invalid API key (redacted)" } }, { status: 401 });
		}
		let body: { input?: string[]; model?: string; output_dimension?: number } = {};
		try {
			body = (await request.clone().json()) as typeof body;
		} catch {}
		const inputs = Array.isArray(body.input) ? body.input : [];
		const requestedDim = typeof body.output_dimension === "number" ? body.output_dimension : 384;
		const data = inputs.map((_, i) => ({
			object: "embedding",
			embedding: generateEmbedding(requestedDim, i + 50),
			index: i,
		}));
		return HttpResponse.json({
			object: "list",
			data,
			model: body.model ?? "voyage-4-lite",
			usage: { total_tokens: inputs.length * 6 },
		});
	}),

	http.post(/voyageai\.com\/v1\/rerank$/, async ({ request }) => {
		if (forceRerankError) {
			return HttpResponse.json({ error: { message: "Rerank failed (redacted)" } }, { status: 400 });
		}
		let body: { documents?: string[]; model?: string; top_k?: number } = {};
		try {
			body = (await request.clone().json()) as typeof body;
		} catch {}
		const docs = Array.isArray(body.documents) ? body.documents : [];
		const topK = typeof body.top_k === "number" ? body.top_k : docs.length;
		const data = docs.slice(0, topK).map((doc, i) => ({
			index: i,
			relevance_score: Math.round((1 - i * 0.1) * 100) / 100,
			document: doc,
		}));
		return HttpResponse.json({
			object: "list",
			data,
			model: body.model ?? "rerank-2",
			usage: { total_tokens: docs.length * 10 },
		});
	}),
];
