/**
 * Fake pipeline factory for testing without pulling in the ONNX runtime.
 *
 * Produces deterministic, hash-derived vectors so downstream recall logic can
 * be unit-tested in isolation. Two texts with identical content yield
 * identical vectors; similar texts overlap on a subset of components.
 *
 * @internal
 */

import { createHash } from "node:crypto";
import type {
	FeatureExtractionPipeline,
	FeatureExtractionPipelineFactory,
} from "../types";

const DEFAULT_DIMENSIONS = 384;

export interface FakePipelineOptions {
	/** Embedding dimension. Defaults to 384 (matches all-MiniLM-L6-v2). */
	dimensions?: number;
}

/**
 * Build a fake feature-extraction pipeline that returns deterministic vectors.
 *
 * @param options - Pipeline options.
 * @returns A {@link FeatureExtractionPipeline} instance.
 *
 * @internal
 */
export function createFakePipeline(
	options: FakePipelineOptions = {},
): FeatureExtractionPipeline {
	const dimensions = options.dimensions ?? DEFAULT_DIMENSIONS;

	return async (inputs) => {
		const data = new Float32Array(inputs.length * dimensions);
		for (const [i, text] of inputs.entries()) {
			const vector = deterministicVector(text, dimensions);
			data.set(vector, i * dimensions);
		}
		return { data: Array.from(data), dims: [inputs.length, dimensions] };
	};
}

/**
 * Build a fake pipeline factory wrapping {@link createFakePipeline}.
 *
 * @param options - Pipeline options.
 * @returns A {@link FeatureExtractionPipelineFactory}.
 *
 * @internal
 */
export function createFakePipelineFactory(
	options: FakePipelineOptions = {},
): FeatureExtractionPipelineFactory {
	const pipeline = createFakePipeline(options);
	return async () => pipeline;
}

/**
 * Map a string to a deterministic, L2-normalized vector.
 *
 * The same token always lands on the same dimension, so identical strings are
 * identical vectors and token-overlapping strings are partially similar —
 * enough to exercise recall merging without the real model.
 */
function deterministicVector(text: string, dimensions: number): Float32Array {
	const vector = new Float32Array(dimensions);
	const tokens = text
		.toLowerCase()
		.split(/[^a-z0-9]+/i)
		.filter(Boolean);
	for (const token of tokens) {
		const bucket = Math.abs(hashCode(token)) % dimensions;
		vector[bucket] = (vector[bucket] ?? 0) + 1;
	}
	// L2 normalize so cosine similarity behaves.
	let norm = 0;
	for (const v of vector) norm += v * v;
	norm = Math.sqrt(norm);
	if (norm > 0) {
		for (let i = 0; i < vector.length; i++) {
			vector[i] = (vector[i] ?? 0) / norm;
		}
	}
	return vector;
}

function hashCode(value: string): number {
	const hex = createHash("sha256").update(value).digest("hex");
	// Use the first 8 hex chars as a 32-bit integer.
	return Number.parseInt(hex.slice(0, 8), 16);
}
