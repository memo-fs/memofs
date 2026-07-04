/**
 * Open-redirect guard — pure, runtime-agnostic.
 *
 * `safeRelativeRedirect` lives here (and NOT in `session.server.ts`) because it
 * is pure string validation with zero server-only dependencies, so it MUST be
 * importable from BOTH client code (e.g. `routes/_auth/hooks/use-auth-redirect`)
 * and server code (loaders/actions). Co-locating it in `session.server.ts` (a
 * `.server` module) broke the React Router client build: the `.server` suffix
 * triggers automatic elimination of server-only code, and a client import of such
 * a module is a build error. Keeping the guard here keeps the SSOT while letting
 * both runtimes import it.
 *
 * @see {@link ./session.server} re-exports this for legacy import paths.
 */
import { redirect as rrRedirect } from "react-router";

/**
 * Default destination when a redirect target is missing or unsafe.
 */
export const SAFE_REDIRECT_DEFAULT = "/dashboard";

/**
 * Coerces an attacker-influenced redirect target into a same-origin path.
 *
 * The `redirect`/`callbackURL` values originate from the URL / form body and flow
 * into Better Auth's post-login redirect. Without validation an absolute URL
 * (`https://evil.com`) would win during URL resolution and phish the user off-site
 * after a legitimate sign-in (VULN-001). The cloud app has no legitimate
 * cross-origin post-login destination, so this enforces the strictest policy: a
 * path starting with a single `/` (rejects `//evil.com` — the protocol-relative
 * form — and any scheme://host). Anything else falls back to
 * {@link SAFE_REDIRECT_DEFAULT}.
 *
 * @param to the raw redirect target from a query param or form field.
 */
export function safeRelativeRedirect(
	to: FormDataEntryValue | string | null | undefined,
): string {
	if (!to || typeof to !== "string") return SAFE_REDIRECT_DEFAULT;
	// Same-origin relative path: "/dashboard", "/projects/x". Reject "//evil.com"
	// (protocol-relative — resolves to evil.com) and backslash variants.
	if (/^\/[^/\\]/.test(to) || to === "/") return to;
	return SAFE_REDIRECT_DEFAULT;
}

/**
 * Builds a React Router `redirect()` Response to a validated same-origin path.
 *
 * Convenience for server code that validates an incoming redirect target and
 * immediately throws a redirect — the two-step is repeated across auth routes, so
 * it is collapsed here. The guard runs first so an unsafe target can never reach
 * the `Location` header.
 *
 * @param to the raw redirect target (validated through `safeRelativeRedirect`).
 */
export function safeRedirect(
	to: FormDataEntryValue | string | null | undefined,
): Response {
	return rrRedirect(safeRelativeRedirect(to));
}
