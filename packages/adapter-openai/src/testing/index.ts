/**
 * @file Testing utilities for @memofs/core/openai.
 *
 * @remarks
 * This module exports fake/mock implementations of OpenAI clients
 * for use in unit tests. These allow testing without making actual API calls.
 *
 * @public
 */

export type { FakeOpenAIClientOptions } from "./fake-openai-client";
export {
	createFakeOpenAIClient,
	FakeOpenAIEmbeddingsClient,
} from "./fake-openai-client";
