import { describe, expect, it } from "vitest";
import { OpenAIAPIError } from "../src";
import { computeBackoffDelay, isRetryableError } from "../src/utils/retry";

describe("retry helpers", () => {
	it("marks 429 and 5xx as retryable", () => {
		expect(isRetryableError(new OpenAIAPIError("rate", { status: 429 }))).toBe(
			true,
		);
		expect(
			isRetryableError(new OpenAIAPIError("server", { status: 503 })),
		).toBe(true);
		expect(isRetryableError(new OpenAIAPIError("bad", { status: 400 }))).toBe(
			false,
		);
	});

	it("computes deterministic backoff without jitter", () => {
		expect(
			computeBackoffDelay(0, {
				baseDelayMs: 100,
				maxDelayMs: 1000,
				jitter: false,
			}),
		).toBe(100);
		expect(
			computeBackoffDelay(2, {
				baseDelayMs: 100,
				maxDelayMs: 1000,
				jitter: false,
			}),
		).toBe(400);
	});
});
