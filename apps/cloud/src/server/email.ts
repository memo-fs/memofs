/**
 * Plunk email transport for magic-link authentication.
 *
 * Plunk has no SDK — it's a plain HTTPS POST to `api.useplunk.com/v1/send` with
 * a Bearer token. The HTML body is rendered from the React Email template
 * (`src/emails/magic-link`) via the `.tsx` render seam in
 * `src/emails/render-magic-link`, so this module is only the transport, not the
 * copy. Keeping the JSX out of this file lets it stay pure-TypeScript.
 *
 * This implements {@link MagicLinkMailer} from `auth.ts`, keeping the auth
 * factory transport-agnostic: swap this for a dev SMTP transport in tests
 * without touching `auth.ts`.
 *
 * `PLUNK_API_KEY` is optional on the env type — when absent we construct a dev
 * mailer that logs the link instead of calling Plunk, so local sign-in works
 * without an API key.
 *
 * @see MagicLinkMailer in {@link ./auth.ts} — the contract this satisfies.
 */

import { renderMagicLinkHtml } from "../emails/render-magic-link";
import type { MagicLinkMailer } from "./auth";
import type { CloudWorkerEnv } from "./env";

/** Plunk API endpoint (no trailing slash). */
const PLUNK_ENDPOINT = "https://api.useplunk.com/v1/send";

/** Default From when `PLUNK_FROM` is unset; overridden by `wrangler.jsonc` in prod. */
const DEFAULT_FROM = "TekMemo Cloud <team@tekbreed.com>";

/**
 * Builds the magic-link mailer for the current request.
 *
 * Returns a Plunk-backed mailer when `PLUNK_API_KEY` is bound, otherwise a dev
 * mailer that logs the link (so `pnpm dev` sign-in works keyless). The branch
 * is decided once per request in `createAuth`'s caller, not per email.
 *
 * @param env per-request Worker env.
 * @returns a {@link MagicLinkMailer} suitable for injection into `createAuth`.
 */
export function createMagicLinkMailer(env: CloudWorkerEnv): MagicLinkMailer {
	if (env.PLUNK_API_KEY) {
		return new PlunkMailer(env);
	}
	return new DevLogMailer();
}

/**
 * Plunk-backed mailer. POSTs the rendered HTML to Plunk; surfaces transport
 * failures via the thrown promise so Better Auth returns a retryable error
 * rather than silently dropping the link.
 */
class PlunkMailer implements MagicLinkMailer {
	constructor(private readonly env: CloudWorkerEnv) {}

	async sendMagicLink({
		email,
		url,
	}: {
		email: string;
		url: string;
		token: string;
	}): Promise<void> {
		const html = await renderMagicLinkHtml(url);
		const from = this.env.PLUNK_FROM ?? DEFAULT_FROM;

		const response = await fetch(PLUNK_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.env.PLUNK_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				to: email,
				subject: "Sign in to TekMemo Cloud",
				from,
				body: html,
			}),
		});

		if (!response.ok) {
			// Don't surface Plunk's body verbatim (PII/quota detail) — log it
			// server-side and throw a generic message.
			const detail = await response.text().catch(() => "");
			console.error("[email] Plunk send failed", {
				status: response.status,
				to: email,
				detail: detail.slice(0, 200),
			});
			throw new Error(`Plunk send failed (${response.status})`);
		}
	}
}

/**
 * Dev mailer: logs the magic link instead of sending it. Used when
 * `PLUNK_API_KEY` is unset so local development and CI can exercise the
 * sign-in flow without an external email dependency.
 */
class DevLogMailer implements MagicLinkMailer {
	async sendMagicLink({
		email,
		url,
	}: {
		email: string;
		url: string;
		token: string;
	}): Promise<void> {
		console.info("[email:dev] magic link", { to: email, url });
	}
}
