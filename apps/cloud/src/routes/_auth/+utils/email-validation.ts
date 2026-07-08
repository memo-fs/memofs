/**
 * Email validation for passwordless auth (SC4.1).
 *
 * Validation is layered into Zod schemas via `superRefine`:
 *   1. Format check — Zod's `.email()` (syntactic)
 *   2. Disposable-domain blocklist — synchronous `superRefine`
 *   3. MX-record check — async `superRefine` (signup only; login omits to
 *      avoid lockout on transient DoH failures)
 *
 * The blocklist is a minimal seed; the production runtime will refresh it from
 * a vendored `disposable-email-domains` list at deploy time.
 */

/**
 * Well-known disposable / temporary email providers. A representative seed of
 * the most common ones; the full list lives in the disposable-email-domains npm
 * package (to be wired at runtime, not vendored into source).
 */
const DISPOSABLE_DOMAINS = new Set([
	"mailinator.com",
	"guerrillamail.com",
	"10minutemail.com",
	"tempmail.com",
	"temp-mail.org",
	"throwaway.email",
	"trashmail.com",
	"yopmail.com",
	"getnada.com",
	"dispostable.com",
	"dropoffs.org",
	"dropon.com",
	"sharklasers.com",
	"maildrop.cc",
]);

/**
 * Check if a domain is a known disposable/temporary email provider.
 */
export function isDisposableDomain(domain: string): boolean {
	return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}
