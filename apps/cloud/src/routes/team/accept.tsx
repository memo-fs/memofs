import { env } from "cloudflare:workers";
import { XCircle } from "lucide-react";
import { redirect } from "react-router";
import {
	acceptInvitation,
	getInvitationByToken,
	TeamMutationError,
} from "~/.server/queries";
import { requireUser } from "~/.server/session";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { buildNoindexMeta } from "~/lib/seo";
import type { Route } from "./+types/accept";

/**
 * Team-invitation accept route — `/team/accept?token=…` (SC7).
 *
 * The emailed link points here. This is the single place an invitation becomes a
 * membership. The flow:
 *   1. Validate the token (hash-lookup) → resolve the pending invite.
 *   2. Require an authenticated user (redirects to `/login?redirect=…` if not).
 *      A non-user invitee signs up first via the magic-link flow; their
 *      `user.create.after` hook provisions an account, then they follow the link
 *      again (the loader re-runs).
 *   3. Assert the signed-in user's email matches the invite email — the
 *      anti-hijack check. A token forwarded to another account can never join
 *      that account to the team.
 *   4. `acceptInvitation` stamps the invite single-use + upserts the membership,
 *      then redirects to `/dashboard/team?joined=1`.
 *
 * Clear failure states render (invalid/expired/already-accepted/mismatch)
 * without leaking whether an email is invited — a token that doesn't resolve and
 * one that resolves but mismatches look identical to the viewer. A successful
 * accept never reaches the component: the loader throws a redirect.
 *
 * @see {@link ../../server/queries/teams} `acceptInvitation` — the join logic.
 */

export function meta() {
	return buildNoindexMeta("Accept invitation — Memo FS Cloud");
}

/** The terminal outcome the component renders (success redirects in the loader). */
type AcceptOutcome =
	| { kind: "not_found" }
	| { kind: "expired" }
	| { kind: "email_mismatch" }
	| { kind: "needs_account" }
	| { kind: "error"; message: string };

/** Server data: the accept outcome. A success redirects, never returns here. */
export interface AcceptLoaderData {
	outcome: AcceptOutcome;
}

export async function loader({
	request,
}: Route.LoaderArgs): Promise<AcceptLoaderData> {
	const url = new URL(request.url);
	const rawToken = url.searchParams.get("token") ?? "";
	const salt = env.API_KEY_SALT;
	if (!salt) {
		return {
			outcome: {
				kind: "error",
				message: "Server configuration error. Please try again later.",
			},
		};
	}

	// A missing/blank token renders not_found (no leak of whether an email is
	// invited). Resolve the invite before requiring auth so a bad/expired token
	// shows a clear state without forcing a login round-trip first.
	if (!rawToken) {
		return { outcome: { kind: "not_found" } };
	}

	const invitation = await getInvitationByToken(rawToken, salt);
	if (!invitation || invitation.acceptedAt !== null) {
		// Unknown token OR already-used invite → identical not_found state so a
		// forwarded-link viewer can't tell a once-valid token from a never-valid one.
		return { outcome: { kind: "not_found" } };
	}
	if (new Date(invitation.expiresAt).getTime() < Date.now()) {
		return { outcome: { kind: "expired" } };
	}

	// Require auth. An unauthenticated viewer bounces to login with this URL as
	// the redirect target, so they land back here after signing up/signing in.
	const user = await requireUser(request);

	// Anti-hijack: the signed-in email must match the invite email.
	if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
		return { outcome: { kind: "email_mismatch" } };
	}

	// The accepter needs a billing account (the membership row FK-links to one).
	// `requireUser` resolves the session; accountId is null only if provisioning
	// raced. Surface a clear "finish signing up" state rather than accepting into
	// a dangling membership.
	if (!user.accountId) {
		return { outcome: { kind: "needs_account" } };
	}

	try {
		await acceptInvitation({
			rawToken,
			accepterId: user.accountId,
			accepterEmail: user.email,
			salt,
		});
		// Success → off to the team page. `?joined=1` lets the team route show a
		// confirmation banner (the redirect carries no body).
		throw redirect("/dashboard/team?joined=1");
	} catch (err) {
		if (err instanceof Response) throw err; // the redirect above
		if (err instanceof TeamMutationError) {
			return { outcome: { kind: "error", message: err.code } };
		}
		throw err; // unexpected — let the app envelope handle it.
	}
}

export default function AcceptInvitationPage({
	loaderData,
}: Route.ComponentProps) {
	const { outcome } = loaderData;

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-6">
			<Card className="max-w-md">
				<CardHeader className="text-center">
					<XCircle className="mx-auto mb-2 h-10 w-10 text-destructive" />
					<CardTitle className="text-lg font-semibold">
						{titleFor(outcome)}
					</CardTitle>
					<CardDescription className="text-xs">
						{descriptionFor(outcome)}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex justify-center">
					<Button asChild size="sm" className="h-9 text-xs">
						<a href="/dashboard">Go to dashboard</a>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

/** Title copy for each terminal outcome. */
function titleFor(outcome: AcceptOutcome): string {
	switch (outcome.kind) {
		case "not_found":
			return "Invitation not found";
		case "expired":
			return "Invitation expired";
		case "email_mismatch":
			return "Wrong account";
		case "needs_account":
			return "Finish signing up";
		case "error":
			return "Couldn't accept";
	}
}

/** Body copy for each terminal outcome. */
function descriptionFor(outcome: AcceptOutcome): string {
	switch (outcome.kind) {
		case "not_found":
			return "This invitation doesn't exist or has already been used. Ask a team owner to resend it.";
		case "expired":
			return "This invitation link has expired. Ask a team owner to send a new one.";
		case "email_mismatch":
			return "This invitation is for a different email address. Sign in with the email that received it.";
		case "needs_account":
			return "We're still setting up your account. Refresh in a moment, then open the invitation link again.";
		case "error":
			return `We couldn't complete this (${outcome.message}). Please try again or ask the team owner to resend the invite.`;
	}
}
