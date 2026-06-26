/**
 * Magic-link request rate limiting (SC4.1 defense).
 *
 * Passwordless auth turns the inbox into the only factor, so the
 * request-magic-link endpoint is a prime abuse vector (inbox flooding, list
 * bombing, enumeration). This module caps it per-IP via Upstash Redis using a
 * sliding window. Upstash is REST-based so it runs in the Worker without a TCP
 * socket (unlike the Turso driver, which has its own fetch transport).
 *
 * Graceful degradation: when the Upstash env is unset (local dev, or an env
 * that hasn't provisioned Redis yet) the limiter resolves to `null` and callers
 * fall through to the normal path — auth still works, just un-throttled. This
 * keeps the local `pnpm dev` flow dependency-free.
 *
 * @see docs/adr/0005-cloud-tech-stack.md — Upstash as the rate-limit store.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import type { CloudWorkerEnv } from "./env";

/**
 * Requests allowed per window, per IP. Generous enough that a real user
 * retrying after a typo or a lost link isn't blocked; tight enough that
 * automated flooding is contained. Tunable once we have traffic data.
 */
const MAGIC_LINK_MAX = 5;

/** Sliding window length. {@link MAGIC_LINK_MAX} requests per this duration. */
const MAGIC_LINK_WINDOW = "15 m" as const;

/** Redis key namespace — isolates magic-link counters from other Upstash uses. */
const MAGIC_LINK_PREFIX = "tekmemo:ratelimit:magic-link" as const;

/**
 * Build the Upstash-backed limiter, or `null` when Upstash isn't configured.
 *
 * Constructed per-request (cheap: it's a thin config object over the REST
 * client) so the env is always current and there's no module-level state to
 * leak across deploys/preview branches.
 */
export function createMagicLinkLimiter(env: CloudWorkerEnv): Ratelimit | null {
	if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
		return null;
	}

	const redis = new Redis({
		url: env.UPSTASH_REDIS_REST_URL,
		token: env.UPSTASH_REDIS_REST_TOKEN,
	});

	return new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(MAGIC_LINK_MAX, MAGIC_LINK_WINDOW),
		prefix: MAGIC_LINK_PREFIX,
	});
}

/**
 * Resolve the client IP from Worker request headers.
 *
 * Cloudflare sets `CF-Connecting-IP` to the true client address (no spoofable
 * `X-Forwarded-For` chain to walk). Falls back to the first forwarded hop only
 * for non-CF environments (local proxying during dev).
 */
export function getClientIp(request: Request): string {
	const headers = request.headers;
	const cfIp = headers.get("CF-Connecting-IP");
	if (cfIp) return cfIp;

	const forwarded = headers.get("X-Forwarded-For");
	if (forwarded) return forwarded.split(",")[0].trim();

	// Unknown source — bucket under a shared anon key so the limit still applies
	// rather than being bypassed. This is deliberately a fixed string, not the
	// empty string, so it's a stable identifier in Upstash.
	return "anonymous";
}

/** Outcome of {@link consumeMagicLinkToken}. */
export type RateLimitResult = { ok: true } | { ok: false; reset: number };

/**
 * Formats a denied {@link RateLimitResult} into the user-facing retry message +
 * whole-second delay — the single source of truth for this conversion so login
 * and signup render an identical 429. Returns `null` when the result is NOT a
 * denial (callers guard with this before building a 429 response).
 */
export function rateLimitMessage(result: RateLimitResult): {
	seconds: number;
	error: string;
} | null {
	if (result.ok) return null;
	const seconds = Math.max(Math.ceil((result.reset - Date.now()) / 1000), 0);
	return { seconds, error: `Too many requests. Try again in ${seconds}s.` };
}

/**
 * Consume one magic-link request slot for the requesting IP.
 *
 * Returns `{ ok: true }` when the request may proceed, or `{ ok: false, reset }`
 * with the unix-ms timestamp when the caller may retry. When no limiter is
 * configured (Upstash unset), always allows — see module doc.
 *
 * The limiter's `pending` promise (cross-region sync + analytics) is drained in
 * the background via `ctx.waitUntil` so it never blocks the response, per the
 * Upstash Cloudflare guidance.
 */
export async function consumeMagicLinkToken(
	env: CloudWorkerEnv,
	request: Request,
	ctx: ExecutionContext,
): Promise<RateLimitResult> {
	const limiter = createMagicLinkLimiter(env);
	if (!limiter) return { ok: true };

	const ip = getClientIp(request);
	const result = await limiter.limit(ip);

	// Drain background analytics/sync off the hot path. Ignoring rejections here
	// is correct: a failed analytics write must not fail the auth request.
	ctx.waitUntil(result.pending.catch(() => {}));

	if (!result.success) {
		return { ok: false, reset: result.reset };
	}
	return { ok: true };
}
