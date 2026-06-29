/**
 * Renders the team-invitation email template to HTML.
 *
 * Sibling of {@link ./render-magic-link}: the single `.tsx` seam where the React
 * Email template meets the string the transport sends. Keeping the render call
 * out of `email.ts` lets the transport module stay pure-TypeScript and trivially
 * testable.
 *
 * @see {@link ./team-invitation} for the template.
 * @see {@link ../server/email} for the transport that calls this.
 */

import type { ReactElement } from "react";
import { render } from "react-email";

import { TeamInvitationEmail } from "./team-invitation";

/** Invitation-link lifetime surfaced in the email copy; matches the accept route. */
export const INVITATION_TTL_DAYS = 7;

/**
 * Renders the team-invitation email to HTML.
 *
 * The caller supplies the per-invitation fields (names, role, url); this seam
 * injects the constant `expiresInDays` so the copy stays in lockstep with the
 * accept-route validity window ({@link INVITATION_TTL_DAYS}).
 *
 * @param props the template props — see {@link TeamInvitationEmail}, minus
 *              `expiresInDays` (injected here from {@link INVITATION_TTL_DAYS}).
 */
export async function renderTeamInvitationHtml(
	props: Omit<
		React.ComponentProps<typeof TeamInvitationEmail>,
		"expiresInDays"
	>,
): Promise<string> {
	const element: ReactElement = (
		<TeamInvitationEmail expiresInDays={INVITATION_TTL_DAYS} {...props} />
	);
	return render(element);
}
