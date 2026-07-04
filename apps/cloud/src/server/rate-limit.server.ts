/**
 * Magic-link request rate limiting (SC4.1 defense).
 *
 * Passwordless auth turns the inbox into the only factor, so the
 * request-magic-link endpoint is a prime abuse vector (inbox flooding, list
 * bombing, enumeration). This module caps it per-IP via Cloudflare's native
 * Rate Limiting binding (SESSION_RATE_LIMIT).
 *
 * Graceful degradation: when the Rate Limit binding is unset (local dev, or an env
 * that hasn't bound it yet) the limiter resolves to `{ ok: true }` and callers
 * fall through to the normal path — auth still works, just un-throttled. This
 * keeps the local `pnpm dev` flow dependency-free.
 */

import type { CloudWorkerEnv } from "./env";

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
 * configured, always allows.
 */
export async function consumeMagicLinkToken(
	env: CloudWorkerEnv,
	request: Request,
	ctx: ExecutionContext,
): Promise<RateLimitResult> {
	if (!env.SESSION_RATE_LIMIT) {
		return { ok: true };
	}

	const ip = getClientIp(request);

	try {
		// Cloudflare Rate Limiting binding call.
		const limitResult = await env.SESSION_RATE_LIMIT.limit({ key: ip });
		if (!limitResult.success) {
			// Native rate limit hit, back off for 60 seconds.
			return { ok: false, reset: Date.now() + 60000 };
		}
	} catch (error) {
		// Fallback gracefully on rate limiting service errors to avoid lockouts.
		console.error("[rate-limit] Cloudflare limit call failed", error);
	}

	return { ok: true };
}
