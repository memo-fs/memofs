/**
 * Renders the magic-link email template to HTML.
 *
 * Lives in `.tsx` (not the transport's `.ts`) because it constructs a JSX
 * element. Keeping the render call out of `email.ts` lets the transport module
 * stay pure-TypeScript and trivially testable; this is the single seam where
 * the React Email template meets the string the transport sends.
 *
 * @see {@link ./magic-link} for the template.
 * @see {@link ../server/email} for the transport that calls this.
 */

import type { ReactElement } from "react";
import { render } from "react-email";

import { MagicLinkEmail } from "./magic-link";

/** Magic-link lifetime surfaced in the email copy; matches Better Auth default. */
const MAGIC_LINK_TTL_MINUTES = 5;

/**
 * Renders the magic-link sign-in email to HTML.
 *
 * @param url the full Better Auth verify URL (`${baseURL}/api/auth/magic-link/verify?token=…`).
 */
export async function renderMagicLinkHtml(url: string): Promise<string> {
	const element: ReactElement = (
		<MagicLinkEmail url={url} expiresInMinutes={MAGIC_LINK_TTL_MINUTES} />
	);
	return render(element);
}
