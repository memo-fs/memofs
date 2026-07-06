import { env as cfEnv } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import {
	consumeMagicLinkToken,
	getClientIp,
	type RateLimitResult,
	rateLimitMessage,
} from "../rate-limit";

vi.mock("cloudflare:workers", () => ({
	env: {} as any,
}));

/** A no-op ExecutionContext for the waitUntil drain path. */
const noopCtx = {
	waitUntil: () => {},
} as unknown as ExecutionContext;

describe("consumeMagicLinkToken", () => {
	it("always allows when no rate-limit binding is configured (graceful dev degradation)", async () => {
		// SESSION_RATE_LIMIT unset → short-circuits to ok without calling out.
		// This is the local `pnpm dev` path (binding optional).
		cfEnv.SESSION_RATE_LIMIT = undefined as any;
		const result = await consumeMagicLinkToken(
			new Request("https://app.test/login", {
				headers: { "CF-Connecting-IP": "1.2.3.4" },
			}),
			noopCtx,
		);
		expect(result).toEqual({ ok: true });
	});

	it("allows when the binding reports success", async () => {
		const fake = {
			limit: async () => ({ success: true }),
		};
		cfEnv.SESSION_RATE_LIMIT = fake as any;
		const result = await consumeMagicLinkToken(
			new Request("https://app.test/login", {
				headers: { "CF-Connecting-IP": "1.2.3.4" },
			}),
			noopCtx,
		);
		expect(result).toEqual({ ok: true });
	});

	it("denies with a reset window when the binding reports failure", async () => {
		const fake = {
			limit: async () => ({ success: false }),
		};
		cfEnv.SESSION_RATE_LIMIT = fake as any;
		const result = await consumeMagicLinkToken(
			new Request("https://app.test/login", {
				headers: { "CF-Connecting-IP": "1.2.3.4" },
			}),
			noopCtx,
		);
		expect(result.ok).toBe(false);
		expect((result as { reset: number }).reset).toBeGreaterThan(Date.now());
	});

	it("degrades to allow when the binding throws (no lockout on service errors)", async () => {
		// A failing Rate Limit service must NOT lock users out of auth.
		const fake = {
			limit: async () => {
				throw new Error("service unavailable");
			},
		};
		cfEnv.SESSION_RATE_LIMIT = fake as any;
		const result = await consumeMagicLinkToken(
			new Request("https://app.test/login", {
				headers: { "CF-Connecting-IP": "1.2.3.4" },
			}),
			noopCtx,
		);
		expect(result).toEqual({ ok: true });
	});
});

describe("rateLimitMessage", () => {
	it("returns null for an allowed result", () => {
		expect(rateLimitMessage({ ok: true })).toBeNull();
	});

	it("returns whole-second delay + message for a denial", () => {
		const future = Date.now() + 65_000; // 65s → rounds to 65s
		const msg = rateLimitMessage({
			ok: false,
			reset: future,
		} as RateLimitResult);
		expect(msg).not.toBeNull();
		expect(msg?.seconds).toBe(65);
		expect(msg?.error).toContain("65s");
	});

	it("clamps to zero when the reset window has already passed", () => {
		const msg = rateLimitMessage({
			ok: false,
			reset: Date.now() - 1000,
		} as RateLimitResult);
		expect(msg?.seconds).toBe(0);
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
