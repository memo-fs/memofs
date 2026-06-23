/**
 * Core types for the @tekbreed/tekmemo/voyageai package.
 *
 * @remarks
 * Defines configuration, request/response, and embedder types
 * used throughout the VoyageAI integration.
 *
 * @public
 */

import type {
	VoyageEncodingFormat,
	VoyageInputType,
	VoyageOutputDtype,
} from "./models/models";

export type VoyageFetchLike = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

export interface VoyageRetryOptions {
	maxRetries?: number;
	baseDelayMs?: number;
	maxDelayMs?: number;
	jitter?: boolean;
	retryableStatuses?: readonly number[];
}

export interface VoyageClientConfig {
	apiKey: string;
	baseUrl?: string;
	fetch?: VoyageFetchLike;
	timeoutMs?: number;
	retry?: VoyageRetryOptions;
	userAgent?: string;
}

export interface VoyageEmbeddingsRequest {
	input: string[];
	model: string;
	input_type?: VoyageInputType;
	truncation?: boolean;
	output_dimension?: number;
	output_dtype?: VoyageOutputDtype;
	encoding_format?: VoyageEncodingFormat;
}

export interface VoyageEmbeddingObject {
	object?: string;
	embedding: number[];
	index?: number;
}

export interface VoyageEmbeddingsResponse {
	object?: string;
	data: VoyageEmbeddingObject[];
	model?: string;
	usage?: {
		total_tokens?: number;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

export interface VoyageClient {
	createEmbeddings(
		request: VoyageEmbeddingsRequest,
	): Promise<VoyageEmbeddingsResponse>;
}

export interface VoyageEmbedderConfig {
	apiKey?: string;
	client?: VoyageClient;
	model?: string;
	baseUrl?: string;
	fetch?: VoyageFetchLike;
	timeoutMs?: number;
	retry?: VoyageRetryOptions;
	userAgent?: string;
	defaultInputType?: VoyageInputType;
	truncation?: boolean;
	outputDimension?: number;
	outputDtype?: VoyageOutputDtype;
	encodingFormat?: "base64";
	batchSize?: number;
	expectedDimensions?: number;
	allowEmptyText?: boolean;
	allowUnknownModelDimensions?: boolean;
}

import type {
	EmbeddingRecord as BaseEmbeddingRecord,
	EmbedTextsInput as BaseEmbedTextsInput,
	EmbedTextsResult as BaseEmbedTextsResult,
	MemoryEmbedder,
} from "@tekbreed/tekmemo";

export interface EmbedTextsInput extends BaseEmbedTextsInput {
	inputType?: VoyageInputType;
	truncation?: boolean;
	outputDimension?: number;
	outputDtype?: VoyageOutputDtype;
	encodingFormat?: "base64";
}

export interface EmbeddingRecord extends BaseEmbeddingRecord {
	inputType?: VoyageInputType;
}

export interface EmbedTextsResult extends BaseEmbedTextsResult {}

export type { MemoryEmbedder };
