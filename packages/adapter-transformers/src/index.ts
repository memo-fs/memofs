/**
 * @tekmemo/adapter-transformers
 *
 * Zero-config local embedder for TekMemo. Runs a small sentence-embedding
 * model in process via Transformers.js (ONNX runtime) — no API key, no cloud,
 * no network after the first model download.
 *
 * @public
 */

export {
	TransformersEmbedderError,
	TransformersInferenceError,
	TransformersValidationError,
} from "./errors";
export {
	createTransformersEmbedder,
	TransformersEmbedder,
} from "./transformers-embedder";
export type {
	FeatureExtractionPipeline,
	FeatureExtractionPipelineFactory,
	TransformersEmbedderOptions,
	TransformersProgressCallback,
} from "./types";
