/**
 * Newsletter signup proxy for the docs site (VitePress, static).
 *
 * The docs app is a static build with no backend of its own. Plunk exposed a
 * browser-safe public key for direct client calls; Resend does not, so the
 * signup form POSTs here instead. This Pages Function holds the secret
 * `RESEND_API_KEY` (set via `wrangler pages secret`) server-side and forwards
 * the contact to Resend, adding it to the "Docs newsletter" segment. The
 * secret never reaches the browser.
 *
 * Mirrors `memofs-cloud` `subscribeUser` — one Resend segment per audience.
 *
 * Rate limiting: a per-isolate in-memory token bucket keyed by client IP
 * guards against burst abuse (e.g. a script hammering the endpoint to inflate
 * the contact list). It is deliberately coarse — isolate state is not shared
 * across edge locations or reloads — so it is a burst guard, not a hard global
 * limit. To bind a true distributed limit, wire a Cloudflare Rate Limiting
 * binding here and `ctx.env` it like the cloud app's `SESSION_RATE_LIMIT`.
 *
 * @see https://resend.com/docs/api-reference/contacts/create-contact
 */

interface Env {
	/** Resend secret API key (`re_…`). Set via `wrangler pages secret put RESEND_API_KEY`. */
	RESEND_API_KEY: string;
	/** UUID of the Resend segment for docs newsletter subscribers. */
	RESEND_SEGMENT_ID: string;
}

interface SubscribeBody {
	email?: unknown;
}

const RESEND_CONTACTS_ENDPOINT = "https://api.resend.com/contacts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Max signups per IP within the window before the bucket resets. */
const SIGNUP_LIMIT = 5;
/** Sliding window over which the per-IP bucket is counted (ms). */
const WINDOW_MS = 60_000;

interface Bucket {
	count: number;
	resetAt: number;
}

/** per-isolate burst guard; NOT shared across edge locations. */
const buckets = new Map<string, Bucket>();

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const bucket = buckets.get(ip);
	if (!bucket || now > bucket.resetAt) {
		buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
		return false;
	}
	bucket.count += 1;
	return bucket.count > SIGNUP_LIMIT;
}

/** Best-effort client IP — Cloudflare sets `CF-Connecting-IP`. */
function clientIp(ctx: EventContext<Env, string, unknown>): string {
	return ctx.request.headers.get("CF-Connecting-IP") ?? "unknown";
}

export async function onRequestPost(
	ctx: EventContext<Env, string, unknown>,
): Promise<Response> {
	const { RESEND_API_KEY, RESEND_SEGMENT_ID } = ctx.env;

	if (!RESEND_API_KEY || !RESEND_SEGMENT_ID) {
		return json({ error: "Newsletter is not configured." }, 503);
	}

	if (isRateLimited(clientIp(ctx))) {
		return json({ error: "Too many requests. Please try again later." }, 429);
	}

	let body: SubscribeBody;
	try {
		body = (await ctx.request.json()) as SubscribeBody;
	} catch {
		return json({ error: "Invalid request body." }, 400);
	}

	const email = typeof body.email === "string" ? body.email.trim() : "";
	if (!EMAIL_RE.test(email)) {
		return json({ error: "Please enter a valid email address." }, 400);
	}

	const response = await fetch(RESEND_CONTACTS_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${RESEND_API_KEY}`,
			"Content-Type": "application/json",
			// Resend rejects requests without a User-Agent (403, code 1010).
			"User-Agent": "memofs-docs-newsletter/1.0",
		},
		body: JSON.stringify({
			email,
			unsubscribed: false,
			segments: [{ id: RESEND_SEGMENT_ID }],
		}),
	});

	if (!response.ok) {
		// A 422 from Resend typically means the contact already exists — treat
		// as success so duplicate signups don't surface an error to the user.
		if (response.status === 422) {
			return json({ ok: true, duplicate: true });
		}
		return json({ error: "Subscription failed. Please try again." }, 502);
	}

	return json({ ok: true });
}

function json(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
