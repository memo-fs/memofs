/**
 * Known provider-prefixed secret patterns — the SSOT for "what a real provider
 * API key looks like."
 *
 * @remarks
 * Both the **write blocklist** (`security/secret-blocklist.ts` — write-gating)
 * and **output redaction** (`cloud-client/errors.ts` — error-message redaction)
 * consume this constant. Adding a new provider prefix here automatically makes
 * it both blocked on write AND redacted from error messages — the two paths
 * can no longer drift independently on provider-prefix recognition.
 *
 * Each entry is a {@link SecretPrefixPattern} with a stable `id`, a
 * human-readable `description`, and a `pattern` (global regex). The blocklist
 * spreads these directly into {@link BlocklistRule}; the redaction layer maps
 * them to bare regexes for its `SECRET_PATTERNS` array.
 *
 * @internal
 */

/**
 * A provider-prefixed secret pattern shared across security surfaces.
 *
 * @internal
 */
export interface SecretPrefixPattern {
	/** Stable machine-readable id (surfaced in `BlocklistRule.id`). */
	id: string;
	/** Human-readable description of what the pattern catches. */
	description: string;
	/** Global regex detecting the secret. Only the full match matters. */
	pattern: RegExp;
}

/**
 * The canonical provider-prefix secret patterns.
 *
 * Order is informational only; consumers report the first match per rule.
 * These are high-precision patterns (unambiguous provider prefixes, specific
 * lengths) — false positives are near-zero.
 *
 * @internal
 */
export const KNOWN_SECRET_PREFIX_PATTERNS: readonly SecretPrefixPattern[] = [
	{
		id: "aws_access_key_id",
		description: "AWS access key ID",
		pattern: /\bAKIA[0-9A-Z]{16}\b/g,
	},
	{
		id: "github_token",
		description: "GitHub personal access / OAuth / app token",
		pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
	},
	{
		id: "openai_api_key",
		description: "OpenAI-style API key",
		pattern: /\bsk-[A-Za-z0-9]{20,}\b/g,
	},
	{
		id: "google_api_key",
		description: "Google API key",
		pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
	},
	{
		id: "slack_token",
		description: "Slack token",
		pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
	},
	{
		id: "stripe_key",
		description: "Stripe secret/restricted key",
		pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{24,}\b/g,
	},
];
