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
	/** Optional sender for welcome email — e.g. `MemoFS Team <team@memofs.dev>`. */
	RESEND_FROM?: string;
}

interface SubscribeBody {
	email?: unknown;
}

const RESEND_CONTACTS_ENDPOINT = "https://api.resend.com/contacts";
const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";

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
	const { RESEND_API_KEY, RESEND_SEGMENT_ID, RESEND_FROM } = ctx.env;

	if (!RESEND_API_KEY || !RESEND_SEGMENT_ID) {
		console.error("[newsletter] missing env", {
			hasKey: Boolean(RESEND_API_KEY),
			hasSegment: Boolean(RESEND_SEGMENT_ID),
		});
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

	let contactRes: Response;
	try {
		contactRes = await fetch(RESEND_CONTACTS_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${RESEND_API_KEY}`,
				"Content-Type": "application/json",
				// Resend rejects requests without a User-Agent (403, code 1010).
				"User-Agent": "memofs-docs-newsletter/1.0",
			},
			body: JSON.stringify({
				email,
				first_name: "AI",
				last_name: "Engineer",
				unsubscribed: false,
				segments: [{ id: RESEND_SEGMENT_ID }],
			}),
		});
	} catch (err) {
		console.error("[newsletter] fetch failed", {
			message: err instanceof Error ? err.message : String(err),
		});
		return json({ error: "Subscription failed. Please try again." }, 502);
	}

	if (contactRes.ok) {
		// Fire-and-forget welcome email — best-effort, must not block success.
		if (RESEND_FROM) {
			ctx.waitUntil(
				sendWelcomeEmail(RESEND_API_KEY, RESEND_FROM, email).catch((err) => {
					console.error("[newsletter] welcome email failed", {
						to: email,
						message: err instanceof Error ? err.message : String(err),
					});
				}),
			);
		}
		return json({ ok: true });
	}

	// Non-ok — parse Resend error for observability and correct duplicate detection.
	let errorBody = "";
	let errorJson: unknown = null;
	try {
		errorBody = await contactRes.text();
		try {
			errorJson = JSON.parse(errorBody);
		} catch {
			// not JSON
		}
	} catch {
		// ignore
	}

	const status = contactRes.status;
	const errorMessage =
		typeof errorJson === "object" &&
		errorJson !== null &&
		"message" in errorJson &&
		typeof (errorJson as { message: unknown }).message === "string"
			? (errorJson as { message: string }).message
			: errorBody;

	// Only treat as duplicate when Resend explicitly says contact already exists.
	// Previous code treated ANY 422 as duplicate, which masked invalid-segment errors
	// as success — showing success UI while no contact was created.
	const isDuplicate =
		status === 422 &&
		/already exists|already a contact|duplicate/i.test(errorMessage);

	if (isDuplicate) {
		return json({ ok: true, duplicate: true });
	}

	console.error("[newsletter] Resend contact create failed", {
		status,
		email,
		error: errorMessage.slice(0, 500),
	});

	// Surface 4xx from Resend as 502 to avoid leaking internals, but include a safe message.
	if (status === 400 || status === 403 || status === 404) {
		return json(
			{ error: "Subscription failed — newsletter not configured correctly." },
			502,
		);
	}

	return json({ error: "Subscription failed. Please try again." }, 502);
}

async function sendWelcomeEmail(
	apiKey: string,
	from: string,
	to: string,
): Promise<void> {
	const html = `
		<div style="font-family: ui-sans-system, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 560px; margin: 0 auto; padding: 24px;">
			<h1 style="font-size: 20px; margin: 0 0 12px;">You're in — welcome to MemoFS</h1>
			<p style="margin: 0 0 12px;">Thanks for subscribing to the MemoFS changelog & blog.</p>
			<p style="margin: 0 0 12px;">You'll get new posts, release highlights, and the occasional deep dive — no spam.</p>
			<p style="margin: 24px 0 0;">
				<a href="https://docs.memofs.dev" style="color: #111; text-decoration: underline;">Read the docs</a> ·
				<a href="https://github.com/memo-fs/memofs" style="color: #111; text-decoration: underline;">Star on GitHub</a>
			</p>
			<p style="margin: 24px 0 0; font-size: 12px; color: #666;">You’re receiving this because you subscribed at docs.memofs.dev. Unsubscribe anytime via the link in future emails.</p>
		</div>
	`.trim();

	await fetch(RESEND_EMAILS_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			"User-Agent": "memofs-docs-newsletter/1.0",
		},
		body: JSON.stringify({
			from,
			to,
			subject: "Welcome to MemoFS — you're subscribed",
			html,
		}),
	});
}

function json(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
