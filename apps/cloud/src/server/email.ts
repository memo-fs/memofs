/**
 * Plunk email transport for outbound TekMemo mail.
 *
 * Plunk has no SDK — it's a plain HTTPS POST to `api.useplunk.com/v1/send` with
 * a Bearer token. HTML bodies are rendered from React Email templates
 * (`src/emails/*`) via their `.tsx` render seams, so this module is only the
 * transport, not the copy. Keeping the JSX out of this file lets it stay
 * pure-TypeScript.
 *
 * Two outbound mail types share this transport:
 *   - **magic-link sign-in** (`src/emails/magic-link`) — implements the
 *     {@link MagicLinkMailer} contract Better Auth injects (`auth.ts`).
 *   - **team invitation** (`src/emails/team-invitation`) — the single-use accept
 *     link the dashboard `/team` action mints (ADR 0011 Phase 2).
 *
 * `PLUNK_API_KEY` is optional on the env type — when absent we construct a dev
 * mailer that logs the link instead of calling Plunk, so local dev + CI work
 * keyless for BOTH flows.
 *
 * @see MagicLinkMailer in {@link ./auth.ts} — the sign-in contract.
 * @see {@link ../emails/render-team-invitation} — the invitation render seam.
 */

import { renderMagicLinkHtml } from "../emails/render-magic-link";
import { renderTeamInvitationHtml } from "../emails/render-team-invitation";
import type { MagicLinkMailer } from "./auth";
import type { CloudWorkerEnv } from "./env";

/** Plunk API endpoint (no trailing slash). */
const PLUNK_ENDPOINT = "https://api.useplunk.com/v1/send";

/** Default From when `PLUNK_FROM` is unset; overridden by `wrangler.jsonc` in prod. */
const DEFAULT_FROM = "TekMemo Cloud <team@tekbreed.com>";

/**
 * The team-invitation mail payload the dashboard action hands to the transport.
 * Mirrors the props of the React Email template; `url` is the accept link.
 */
export interface TeamInvitationMail {
	/** The invitee's email — the Plunk `to` address. */
	email: string;
	/** The accept link — `${baseURL}/team/accept?token=…`. */
	url: string;
	/** Invitee name/email for the greeting (falls back to the email local-part). */
	inviteeName: string;
	/** The team being joined. */
	teamName: string;
	/** The inviting account's display name. */
	inviterName: string;
	/** The role the invitee receives on accept. */
	role: "admin" | "member";
}

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
 * Builds a mailer that can send BOTH magic-link sign-in and team invitations.
 * The dashboard `/team` action uses this; the auth factory still uses
 * {@link createMagicLinkMailer} (it only needs the sign-in contract).
 *
 * @param env per-request Worker env.
 */
export function createMailer(
	env: CloudWorkerEnv,
): MagicLinkMailer & TeamInvitationSender {
	if (env.PLUNK_API_KEY) {
		return new PlunkMailer(env);
	}
	return new DevLogMailer();
}

/** The invitation-sending half of the transport — `createMailer` returns both. */
export interface TeamInvitationSender {
	/** Delivers the team-invitation accept link to `inviteeName`/`url`. */
	sendTeamInvitation(mail: TeamInvitationMail): Promise<void>;
}

/**
 * Plunk-backed mailer. POSTs the rendered HTML to Plunk; surfaces transport
 * failures via the thrown promise so the caller returns a retryable error
 * rather than silently dropping the link. Implements both mail types.
 */
class PlunkMailer implements MagicLinkMailer, TeamInvitationSender {
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
		await this.send({
			to: email,
			subject: "Sign in to TekMemo Cloud",
			html,
		});
	}

	async sendTeamInvitation({
		email,
		url,
		inviteeName,
		teamName,
		inviterName,
		role,
	}: TeamInvitationMail): Promise<void> {
		const html = await renderTeamInvitationHtml({
			url,
			inviteeName,
			teamName,
			inviterName,
			role,
		});
		await this.send({
			to: email,
			subject: `${inviterName} invited you to join ${teamName}`,
			html,
		});
	}

	/** Shared Plunk POST — the one fetch both mail types use. */
	private async send({
		to,
		subject,
		html,
	}: {
		to: string;
		subject: string;
		html: string;
	}): Promise<void> {
		const from = this.env.PLUNK_FROM ?? DEFAULT_FROM;
		const response = await fetch(PLUNK_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.env.PLUNK_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ to, subject, from, body: html }),
		});

		if (!response.ok) {
			// Don't surface Plunk's body verbatim (PII/quota detail) — log it
			// server-side and throw a generic message.
			const detail = await response.text().catch(() => "");
			console.error("[email] Plunk send failed", {
				status: response.status,
				to,
				detail: detail.slice(0, 200),
			});
			throw new Error(`Plunk send failed (${response.status})`);
		}
	}
}

/**
 * Dev mailer: logs the links instead of sending them. Used when
 * `PLUNK_API_KEY` is unset so local development and CI can exercise both the
 * sign-in + invitation flows without an external email dependency.
 */
class DevLogMailer implements MagicLinkMailer, TeamInvitationSender {
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

	async sendTeamInvitation(mail: TeamInvitationMail): Promise<void> {
		console.info("[email:dev] team invitation", mail);
	}
}
