import { describe, expect, it } from "vitest";

import type { CloudWorkerEnv } from "../env";
import {
	consumeMagicLinkToken,
	createMagicLinkLimiter,
	getClientIp,
} from "../rate-limit.server";

/**
 * Minimal env stub. Only the Upstash fields matter for these tests; the rest
 * are cast through `as` to satisfy the `CloudWorkerEnv` shape without spinning
 * up real R2/Turso bindings (which need a Worker runtime — out of vitest scope).
 */
function envWith(upstash: { url?: string; token?: string }): CloudWorkerEnv {
	return {
		UPSTASH_REDIS_REST_URL: upstash.url,
		UPSTASH_REDIS_REST_TOKEN: upstash.token,
	} as unknown as CloudWorkerEnv;
}

/** A no-op ExecutionContext for the waitUntil drain path. */
const noopCtx = {
	waitUntil: () => {},
} as unknown as ExecutionContext;

describe("createMagicLinkLimiter", () => {
	it("returns null when Upstash env is unset (graceful dev degradation)", () => {
		expect(createMagicLinkLimiter(envWith({}))).toBeNull();
	});

	it("returns null when only the URL is set", () => {
		expect(
			createMagicLinkLimiter(envWith({ url: "https://x.upstash.io" })),
		).toBeNull();
	});

	it("returns a limiter when both URL + token are set", () => {
		const limiter = createMagicLinkLimiter(
			envWith({ url: "https://x.upstash.io", token: "secret" }),
		);
		// We don't exercise the Redis path here (needs a live Upstash instance);
		// we only assert construction succeeds and exposes the limit() API.
		expect(limiter).not.toBeNull();
		expect(typeof limiter?.limit).toBe("function");
	});
});

describe("consumeMagicLinkToken", () => {
	it("always allows when no limiter is configured", async () => {
		// Upstash unset → limiter is null → short-circuits to ok without touching
		// Redis. This is the local `pnpm dev` path.
		const result = await consumeMagicLinkToken(
			envWith({}),
			new Request("https://app.test/login", {
				headers: { "CF-Connecting-IP": "1.2.3.4" },
			}),
			noopCtx,
		);
		expect(result).toEqual({ ok: true });
	});
});

describe("getClientIp", () => {
	it("prefers CF-Connecting-IP", () => {
		const request = new Request("https://app.test/login", {
			headers: {
				"CF-Connecting-IP": "203.0.113.7",
				"X-Forwarded-For": "10.0.0.1",
			},
		});
		expect(getClientIp(request)).toBe("203.0.113.7");
	});

	it("falls back to the first X-Forwarded-For hop", () => {
		const request = new Request("https://app.test/login", {
			headers: { "X-Forwarded-For": "198.51.100.2, 10.0.0.1" },
		});
		expect(getClientIp(request)).toBe("198.51.100.2");
	});

	it("trims whitespace around the forwarded hop", () => {
		const request = new Request("https://app.test/login", {
			headers: { "X-Forwarded-For": "  198.51.100.2  , 10.0.0.1" },
		});
		expect(getClientIp(request)).toBe("198.51.100.2");
	});

	it("returns a stable 'anonymous' bucket when no IP header is present", () => {
		// Unknown source is NOT allowed to bypass the limit — it shares one bucket.
		expect(getClientIp(new Request("https://app.test/login"))).toBe(
			"anonymous",
		);
	});
});
