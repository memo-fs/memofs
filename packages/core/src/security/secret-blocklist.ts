import { MemoryWriteBlockedError } from "../core/errors/errors";
import { KNOWN_SECRET_PREFIX_PATTERNS } from "../core/internal/secret-prefixes";

/**
 * @file Write blocklist — hard-rejects secrets/PII before they reach syncable
 * memory files.
 *
 * @remarks
 * This is the read-side-independent safety layer of write intelligence
 * (, layer 1). It is the same security thesis as the
 * connector `secretRef` model — *never store secret material, store
 * an opaque reference* — applied to memory *content*. An agent that scrapes a
 * `.env` and writes `OPENAI_API_KEY=sk-...` into `notes.md` is creating a
 * security hole: `notes.md` syncs to the cloud replica and lives on disk in
 * plaintext. This module stops that at the gate.
 *
 * Design principles:
 *
 * - **Pure and data-driven.** A {@link BlocklistRule} table drives detection; a
 * single {@link detectBlockedContent} function runs every rule. Trivially
 * unit-testable, trivially extensible — add a rule, not a branch.
 * - **High precision over high recall.** v1 favors false negatives (a leaked
 * secret slips through) over false positives (a legitimate note about auth is
 * rejected). Rejected writes are disruptive and erode trust in the tool. The
 * rule set targets the shapes real API keys take (provider prefixes, PEM
 * blocks, JWTs) plus structured `key=value` secret assignments that require a
 * digit and 12+ chars — so "password: must be rotated" and "we use bcrypt"
 * (documentation) never trip.
 * - **Never echo the secret.** Violations carry a redacted {@link
 * BlocklistViolation.preview} (first 3 chars + … + last 1), never the full
 * match. Error messages and logs must propagate only the preview.
 * - **Deterministic, always-on, no LLM.** Per the invariant: the
 * security layer is deterministic by default. There is no LLM path for the
 * blocklist — secrets are rejected regardless of configuration.
 *
 * @see — write intelligence (blocklist + durability tier).
 * @see — the `secretRef` model (reference, never store).
 *
 * @public
 */

/**
 * A single blocklist detection rule.
 *
 * @public
 */
export interface BlocklistRule {
	/** Stable machine-readable id, surfaced in {@link BlocklistViolation.ruleId}. */
	id: string;
	/** Human-readable description of what the rule catches. */
	description: string;
	/**
	 * Pattern detecting the secret. Must be global (the runner executes it across
	 * the whole text). Capturing groups, if any, are ignored — only the full
	 * match matters for redaction.
	 */
	pattern: RegExp;
}

/**
 * One detected violation of the write blocklist.
 *
 * @public
 */
export interface BlocklistViolation {
	/** The {@link BlocklistRule.id} that matched. */
	ruleId: string;
	/** Human-readable description (copied from the matching rule). */
	description: string;
	/**
	 * Redacted preview of the matched text: first 3 chars + `…` + last char, or
	 * the whole match when shorter than 5 chars. **Never the full match** —
	 * violations flow into error messages and must not leak the secret.
	 */
	preview: string;
}

/**
 * The write blocklist rule set.
 *
 * Provider-prefixed secrets (`AKIA…`, `ghp_…`, `sk-…`, `AIza…`, `xox…`,
 * `sk_live_…`) are sourced from the shared {@link KNOWN_SECRET_PREFIX_PATTERNS}
 * SSOT so output redaction (`cloud-client/errors.ts`) and write-gating stay in
 * sync. Blocklist-specific rules (AWS secret in assignment context, PEM blocks,
 * JWTs, connection strings, secret assignments) are defined inline below.
 *
 * Order is informational only; {@link detectBlockedContent} reports the first
 * violation per rule. Add provider prefixes to
 * {@link KNOWN_SECRET_PREFIX_PATTERNS}; add blocklist-specific rules here.
 *
 * @remarks
 * Precision notes:
 * - Provider-prefixed keys are near-zero false-positive — the prefixes are
 * unambiguous.
 * - PEM `PRIVATE KEY` blocks and JWTs (`eyJ…`) are structurally unambiguous.
 * - The `secret_assignment` rule requires the value to be 12+ chars *and*
 * contain a digit, so documentation prose ("password: must be rotated",
 * "we use bcrypt", "secret: see docs") does not trip it. Real API secrets are
 * alphanumeric/base64 and almost always ≥12 chars with a digit.
 * - Connection strings (`scheme://user:pass@host`) catch DB/redis URLs with
 * embedded credentials.
 */
export const BLOCKLIST_RULES: readonly BlocklistRule[] = [
	...KNOWN_SECRET_PREFIX_PATTERNS,
	{
		id: "aws_secret_access_key",
		description: "AWS secret access key in assignment context",
		pattern:
			/\baws_secret_access_key["']?\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}["']?/gi,
	},
	{
		id: "private_key_block",
		description: "PEM private key block",
		pattern:
			/-----BEGIN(?:\s+[A-Z0-9]+)?\s+PRIVATE KEY-----[\s\S]*?-----END(?:\s+[A-Z0-9]+)?\s+PRIVATE KEY-----/g,
	},
	{
		id: "jwt_token",
		description: "JWT (three base64url segments)",
		pattern:
			/\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
	},
	{
		id: "connection_string_credentials",
		description: "Connection string with embedded credentials (user:pass@host)",
		pattern: /\b[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s:/@]+:[^\s:/@]+@[^\s:/]+/g,
	},
	{
		id: "secret_assignment",
		description: "Secret material in a key=value / key: value assignment",
		pattern:
			/\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)["']?\s*[:=]\s*["']?(?=[A-Za-z0-9+/=_-]*\d)[A-Za-z0-9+/=_-]{12,}/gi,
	},
];

/**
 * Detect blocklisted secret material in text.
 *
 * Runs every {@link BLOCKLIST_RULES} rule and returns the violations found
 * (deduplicated by rule — one violation per rule that matches, even if it
 * matches multiple times). Returns an empty array when the text is clean.
 *
 * Pure, synchronous, side-effect free. The caller decides what to do with
 * violations (hard-reject on the write path, warn, redact — the spec
 * mandates hard-reject on `writeMemory` and the agent-session durable-memory
 * append).
 *
 * @param text - The text to scan (note content, title, durable memory, etc.).
 * @returns Violations found, or `[]` when clean. Never throws.
 *
 * @public
 */
export function detectBlockedContent(text: string): BlocklistViolation[] {
	if (typeof text !== "string" || text.length === 0) return [];
	const violations: BlocklistViolation[] = [];
	const seenRules = new Set<string>();

	for (const rule of BLOCKLIST_RULES) {
		if (seenRules.has(rule.id)) continue;
		// Fresh lastIndex per scan — module-level rule patterns are shared and
		// stateful (global regexes carry lastIndex across `.exec`/`.test`).
		const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
		const match = pattern.exec(text);
		if (match?.[0]) {
			violations.push({
				ruleId: rule.id,
				description: rule.description,
				preview: redact(match[0]),
			});
			seenRules.add(rule.id);
		}
	}

	return violations;
}

/**
 * Whether text contains any blocklisted material (convenience over
 * {@link detectBlockedContent} when only a boolean is needed).
 *
 * @public
 */
export function containsBlockedContent(text: string): boolean {
	return detectBlockedContent(text).length > 0;
}

/**
 * Redact a matched secret to a safe preview.
 *
 * Returns the first 3 chars + `…` + the last char for matches ≥5 chars, or the
 * whole match for shorter ones (rare; short matches are already low-signal).
 * Never returns the full match for typical-length secrets.
 *
 * @internal
 */
function redact(match: string): string {
	if (match.length < 5) return match;
	return `${match.slice(0, 3)}…${match.slice(-1)}`;
}

/**
 * Assert that a write is allowed, throwing {@link MemoryWriteBlockedError} if
 * any scanned text contains blocklisted secret material.
 *
 * This is the enforcement half of write intelligence.
 * The pure {@link detectBlockedContent} decides; this function acts. Both the
 * typed write path (`writeMemory` / `updateCoreMemory`) and the agent-session
 * durable-memory append call it, so the two known routes into syncable
 * `notes.md` are both gated.
 *
 * Violations are aggregated across all scanned texts before throwing, so the
 * caller learns of every problem in one shot rather than fixing-and-retrying
 * one at a time. Each violation carries only a redacted preview.
 *
 * @param texts - The text fields to scan (content, title, durable memory).
 * @param path - Optional destination path surfaced in error `details`.
 * @throws {MemoryWriteBlockedError} when any violation is found.
 *
 * @public
 */
export function assertWriteAllowed(texts: string[], path?: string): void {
	const all: BlocklistViolation[] = [];
	for (const text of texts) {
		const violations = detectBlockedContent(text);
		if (violations.length > 0) all.push(...violations);
	}
	if (all.length === 0) return;
	const ruleIds = [...new Set(all.map((v) => v.ruleId))].join(", ");
	const message =
		`Write blocked: content matched ${all.length} secret pattern${all.length === 1 ? "" : "s"} ` +
		`(${ruleIds}). Redact or drop the secret material and retry. ` +
		"Violations carry only a truncated preview — the full secret is not available.";
	throw new MemoryWriteBlockedError(message, {
		violations: all,
		...(path === undefined ? {} : { path }),
	});
}
