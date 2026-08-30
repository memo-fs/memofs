/**
 * Cloudflare Pages Function for newsletter subscriptions. This owns the only
 * server-side docs action; the React app is otherwise deployed as static
 * prerendered output.
 */

import { SITE } from "../src/lib/site";

interface Env {
	RESEND_API_KEY?: string;
	RESEND_SEGMENT_ID?: string;
	RESEND_FROM?: string;
}

interface EventContext {
	request: Request;
	env: Env;
	waitUntil(promise: Promise<unknown>): void;
}

interface Bucket {
	count: number;
	resetAt: number;
}

const RESEND_CONTACTS_ENDPOINT = "https://api.resend.com/contacts";
const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_LIMIT = 5;
const WINDOW_MS = 60_000;
const buckets = new Map<string, Bucket>();

/** Creates the JSON response contract consumed by the signup component. */
function jsonResponse(payload: unknown, status = 200): Response {
	return Response.json(payload, {
		status,
		headers: { "Cache-Control": "no-store" },
	});
}

/** Returns the originating client address, accounting for proxy list headers. */
function getClientIp(request: Request): string {
	return (
		request.headers.get("CF-Connecting-IP") ??
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		"unknown"
	);
}

/** Applies a best-effort per-isolate rate limit before calling Resend. */
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

/** Sends the welcome email after Resend accepts a new contact. */
async function sendWelcomeEmail(apiKey: string, from: string, to: string) {
	const html = `
		<div style="font-family: ui-sans-system, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 560px; margin: 0 auto; padding: 24px;">
			<h1 style="font-size: 20px; margin: 0 0 12px;">You're in — welcome to MemoFS</h1>
			<p style="margin: 0 0 12px;">Thanks for subscribing to the MemoFS changelog & newsletter.</p>
			<p style="margin: 0 0 12px;">You'll get new releases, architecture highlights, and deep dives straight to your inbox.</p>
			<p style="margin: 24px 0 0;">
				<a href="${SITE.docsUrl}" style="color: #111; text-decoration: underline;">Read the docs</a> ·
				<a href="${SITE.githubUrl}" style="color: #111; text-decoration: underline;">Star on GitHub</a> ·
				<a href="${SITE.productUrl}" style="color: #111; text-decoration: underline;">MemoFS Cloud</a>
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

/** Handles newsletter form posts through the Pages Functions runtime. */
export async function onRequestPost(context: EventContext): Promise<Response> {
	const { request, env } = context;
	const { RESEND_API_KEY, RESEND_SEGMENT_ID, RESEND_FROM } = env;

	if (!RESEND_API_KEY || !RESEND_SEGMENT_ID) {
		return jsonResponse({ error: "Newsletter is not configured." }, 503);
	}

	if (isRateLimited(getClientIp(request))) {
		return jsonResponse(
			{ error: "Too many requests. Please try again later." },
			429,
		);
	}

	let email = "";
	try {
		const formData = await request.formData();
		const value = formData.get("email");
		email = typeof value === "string" ? value.trim() : "";
	} catch {
		return jsonResponse({ error: "Invalid form data." }, 400);
	}

	if (!EMAIL_RE.test(email)) {
		return jsonResponse({ error: "Please enter a valid email address." }, 400);
	}

	let contactResponse: Response;
	try {
		contactResponse = await fetch(RESEND_CONTACTS_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${RESEND_API_KEY}`,
				"Content-Type": "application/json",
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
	} catch {
		return jsonResponse(
			{ error: "Subscription failed. Please try again." },
			502,
		);
	}

	if (contactResponse.ok) {
		if (RESEND_FROM) {
			context.waitUntil(
				sendWelcomeEmail(RESEND_API_KEY, RESEND_FROM, email).catch(() => {}),
			);
		}
		return jsonResponse({ ok: true });
	}

	const body = await contactResponse.text().catch(() => "");
	const isDuplicate =
		contactResponse.status === 422 &&
		/already exists|already a contact|duplicate/i.test(body);
	if (isDuplicate) return jsonResponse({ ok: true, duplicate: true });

	return jsonResponse({ error: "Subscription failed. Please try again." }, 502);
}
