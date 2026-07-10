/**
 * Error types for the Transformers.js embedder adapter.
 *
 * @public
 */

export class TransformersEmbedderError extends Error {
	constructor(
		message: string,
		readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "TransformersEmbedderError";
	}
}

/**
 * Raised when inputs fail validation before embedding.
 *
 * @public
 */
export class TransformersValidationError extends TransformersEmbedderError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, details);
		this.name = "TransformersValidationError";
	}
}

/**
 * Raised when the underlying ONNX pipeline fails or returns an unexpected
 * shape.
 *
 * @public
 */
export class TransformersInferenceError extends TransformersEmbedderError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, details);
		this.name = "TransformersInferenceError";
	}
}
