/**
 * @file Constants for Voyage AI rerank models and configuration.
 *
 * @remarks
 * This module defines the default base URL, API path, maximum document limits,
 * and the set of supported Voyage AI rerank models.
 *
 * @internal
 */

/** Default base URL for the Voyage AI API. */
export const VOYAGE_RERANK_DEFAULT_BASE_URL = "https://api.voyageai.com";
/** API path for the Voyage AI rerank endpoint. */
export const VOYAGE_RERANK_PATH = "/v1/rerank";
/** Maximum number of documents supported per rerank request by Voyage AI. */
export const VOYAGE_RERANK_MAX_DOCUMENTS = 1000;

/** Set of supported Voyage AI rerank model identifiers. */
export const VOYAGE_RERANK_MODELS = new Set([
	"rerank-2.5",
	"rerank-2.5-lite",
	"rerank-2",
	"rerank-2-lite",
	"rerank-1",
	"rerank-lite-1",
]);
