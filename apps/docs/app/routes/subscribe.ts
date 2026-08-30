import type { Route } from "./+types/subscribe";

interface Env {
	RESEND_API_KEY?: string;
	RESEND_SEGMENT_ID?: string;
	RESEND_FROM?: string;
}

const RESEND_CONTACTS_ENDPOINT = "https://api.resend.com/contacts";
const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SIGNUP_LIMIT = 5;
const WINDOW_MS = 60_000;

interface Bucket {
	count: number;
	resetAt: number;
}

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

function getEnv(context?: Record<string, unknown>): Env {
	const cloudflareEnv = (
		context as { cloudflare?: { env?: Record<string, string> } } | undefined
	)?.cloudflare?.env;
	return {
		RESEND_API_KEY:
			cloudflareEnv?.RESEND_API_KEY ??
			(typeof process !== "undefined"
				? process.env?.RESEND_API_KEY
				: undefined),
		RESEND_SEGMENT_ID:
			cloudflareEnv?.RESEND_SEGMENT_ID ??
			(typeof process !== "undefined"
				? process.env?.RESEND_SEGMENT_ID
				: undefined),
		RESEND_FROM:
			cloudflareEnv?.RESEND_FROM ??
			(typeof process !== "undefined" ? process.env?.RESEND_FROM : undefined),
	};
}

async function sendWelcomeEmail(
	apiKey: string,
	from: string,
	to: string,
): Promise<void> {
	const html = `
		<div style="font-family: ui-sans-system, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 560px; margin: 0 auto; padding: 24px;">
			<h1 style="font-size: 20px; margin: 0 0 12px;">You're in — welcome to MemoFS</h1>
			<p style="margin: 0 0 12px;">Thanks for subscribing to the MemoFS changelog & newsletter.</p>
			<p style="margin: 0 0 12px;">You'll get new releases, architecture highlights, and deep dives straight to your inbox.</p>
			<p style="margin: 24px 0 0;">
				<a href="https://docs.memofs.dev" style="color: #111; text-decoration: underline;">Read the docs</a> ·
				<a href="https://github.com/memo-fs/memofs" style="color: #111; text-decoration: underline;">Star on GitHub</a> ·
				<a href="https://memofs.dev" style="color: #111; text-decoration: underline;">MemoFS Cloud</a>
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

function jsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function action({ request, context }: Route.ActionArgs) {
	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed" }, 405);
	}

	const env = getEnv(context as Record<string, unknown> | undefined);
	const { RESEND_API_KEY, RESEND_SEGMENT_ID, RESEND_FROM } = env;

	if (!RESEND_API_KEY || !RESEND_SEGMENT_ID) {
		return jsonResponse({ error: "Newsletter is not configured." }, 503);
	}

	const clientIp =
		request.headers.get("CF-Connecting-IP") ??
		request.headers.get("x-forwarded-for") ??
		"unknown";

	if (isRateLimited(clientIp)) {
		return jsonResponse(
			{ error: "Too many requests. Please try again later." },
			429,
		);
	}

	let email = "";
	const contentType = request.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		try {
			const body = (await request.json()) as { email?: unknown };
			email = typeof body?.email === "string" ? body.email.trim() : "";
		} catch {
			return jsonResponse({ error: "Invalid JSON body." }, 400);
		}
	} else {
		try {
			const formData = await request.formData();
			const val = formData.get("email");
			email = typeof val === "string" ? val.trim() : "";
		} catch {
			return jsonResponse({ error: "Invalid form data." }, 400);
		}
	}

	if (!EMAIL_RE.test(email)) {
		return jsonResponse({ error: "Please enter a valid email address." }, 400);
	}

	let contactRes: Response;
	try {
		contactRes = await fetch(RESEND_CONTACTS_ENDPOINT, {
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

	if (contactRes.ok) {
		if (RESEND_FROM) {
			sendWelcomeEmail(RESEND_API_KEY, RESEND_FROM, email).catch(() => {});
		}
		return jsonResponse({ ok: true });
	}

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

	const isDuplicate =
		status === 422 &&
		/already exists|already a contact|duplicate/i.test(errorMessage);

	if (isDuplicate) {
		return jsonResponse({ ok: true, duplicate: true });
	}

	if (status === 400 || status === 403 || status === 404) {
		return jsonResponse(
			{ error: "Subscription failed — newsletter not configured correctly." },
			502,
		);
	}

	return jsonResponse({ error: "Subscription failed. Please try again." }, 502);
}
