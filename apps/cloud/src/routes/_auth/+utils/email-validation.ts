/**
 * Email validation for passwordless auth (SC4.1).
 *
 * Because email is the sole auth factor under magic-link auth, signup must
 * reject disposable/temporary addresses and domains that can't receive mail.
 * The three layers below are the broke+ASAP defense (no paid email-validation
 * API at v1):
 *   1. format check (syntactic)
 *   2. MX-record check (domain can receive mail)
 *   3. disposable-domain blocklist (static, vendored)
 *
 * The blocklist is a minimal seed; the production runtime will refresh it from
 * a vendored `disposable-email-domains` list at deploy time. Until then this is
 * a representative sample — the *mechanism* is what matters for the scaffold.
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
	"sharklasers.com",
	"maildrop.cc",
]);

export type EmailIssue =
	| { kind: "invalid" }
	| { kind: "disposable"; domain: string }
	| { kind: "no-mx"; domain: string };

export type EmailValidation = { ok: true } | { ok: false; issue: EmailIssue };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an email address for signup. Pure + synchronous for the format +
 * disposable checks; the MX check is the caller's responsibility (async DNS).
 * Returns the first issue found, or `{ ok: true }`.
 */
export function validateEmail(email: string): EmailValidation {
	const trimmed = email.trim().toLowerCase();
	if (!EMAIL_RE.test(trimmed)) {
		return { ok: false, issue: { kind: "invalid" } };
	}
	const domain = trimmed.split("@")[1];
	if (DISPOSABLE_DOMAINS.has(domain)) {
		return { ok: false, issue: { kind: "disposable", domain } };
	}
	return { ok: true };
}

/**
 * Human message for a validation issue, surfaced in the signup form.
 */
export function emailIssueMessage(issue: EmailIssue): string {
	switch (issue.kind) {
		case "invalid":
			return "Enter a valid email address.";
		case "disposable":
			return `${issue.domain} is a disposable email provider. Use a real address — magic links can't reach temporary inboxes.`;
		case "no-mx":
			return `${issue.domain} can't receive email (no mail server found). Check the address.`;
	}
}
