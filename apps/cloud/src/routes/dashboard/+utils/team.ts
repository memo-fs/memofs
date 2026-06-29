/**
 * Route-local helpers for the `/dashboard/team` page.
 *
 * These live colocated with the route (not in `server/`) because they couple
 * the server-side invitation model to the dashboard's concerns: minting a
 * single-use accept token, building the emailed accept link, mapping the
 * query-layer's typed error codes to user-facing messages, and resolving the
 * selected team from the request URL.
 *
 * The token format is `tmi_<32 random base64url bytes>` — the `tmi_` prefix
 * (tekmemo-invite) mirrors the API-key `tm_` convention so tokens are
 * recognizable in logs/links without revealing their purpose to a casual
 * observer. The raw token is hashed via the SSOT `hashToken` before persisting
 * (see `queries/teams.ts`); it appears only in the email link.
 *
 * @see {@link ../../../server/queries/teams} — the query layer this wraps.
 */

import type { TeamMutationErrorCode } from "~/server/queries";
import { hashToken } from "~/server/queries";

/** The number of random bytes (base64url-encoded) after the prefix. */
const TOKEN_RANDOM_BYTES = 32;

/**
 * Generates a fresh `tmi_<32 random base64url bytes>` accept token via Web
 * Crypto. The raw token is returned ONCE for the email link; only its hash is
 * persisted.
 */
export function mintInviteToken(): string {
	const bytes = new Uint8Array(TOKEN_RANDOM_BYTES);
	crypto.getRandomValues(bytes);
	return `tmi_${toBase64Url(bytes)}`;
}

/** Builds the accept link from a base URL + raw token. */
export function buildAcceptUrl(baseUrl: string, rawToken: string): string {
	return `${baseUrl.replace(/\/$/, "")}/team/accept?token=${encodeURIComponent(
		rawToken,
	)}`;
}

/**
 * Hashes an invite token for persistence. Thin wrapper over the SSOT `hashToken`
 * so the route doesn't import crypto helpers directly.
 *
 * @param salt  `TEKMEMO_API_KEY_SALT`.
 */
export async function hashInviteToken(
	rawToken: string,
	salt: string,
): Promise<string> {
	return hashToken(rawToken, salt);
}

/**
 * Maps a {@link TeamMutationErrorCode} to a short, user-facing message rendered
 * inline next to the action that triggered it. The messages are action-neutral
 * enough to reuse across invite/remove/role dialogs; the route supplies the
 * surrounding context (which dialog, which field).
 */
export function teamErrorMessage(code: TeamMutationErrorCode): string {
	switch (code) {
		case "not_authorized":
			return "You don't have permission to do that on this team.";
		case "seat_limit_reached":
			return "This team is at its seat limit. Upgrade to invite more members.";
		case "last_owner":
			return "A team can't be left without an owner. Transfer ownership first.";
		case "not_found":
			return "We couldn't find that invitation. It may have been revoked.";
		case "already_invited":
			return "That email is already invited.";
		case "already_member":
			return "That person is already a member of this team.";
		case "expired":
			return "This invitation has expired.";
		case "email_mismatch":
			return "This invitation is for a different email address.";
		default:
			return "Something went wrong. Please try again.";
	}
}

/**
 * Resolves the selected team id for a dashboard request. Priority: an explicit
 * `?teamId=` query param (the switcher sets it on selection), then the account's
 * first owned team (the personal workspace — the universal default), then null.
 * The route validates the resolved id against the account's accessible teams in
 * the loader so a foreign `?teamId=` degrades to the default, not a leak.
 */
export function resolveRequestedTeamId(
	searchParams: URLSearchParams,
	ownedTeamIds: string[],
): string | null {
	const explicit = searchParams.get("teamId");
	if (explicit && ownedTeamIds.includes(explicit)) return explicit;
	return ownedTeamIds[0] ?? null;
}

/** Base64url-encodes a byte array (URL-safe, no padding). */
function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}
