/**
 * Utility functions for scanning text content to detect and redact API keys/secrets.
 *
 * @module secrets
 */

/**
 * Details of a secret scan finding occurrence.
 */
export interface SecretScanFinding {
	/**
	 * Alphanumeric category type of the secret found (e.g. 'openai_key', 'jwt').
	 */
	kind: string;
	/**
	 * The string character offset index where the match starts.
	 */
	index: number;
	/**
	 * Safe redacted preview representation of the secret string.
	 */
	preview: string;
}

const SECRET_PATTERNS: Array<{ kind: string; pattern: RegExp }> = [
	{
		kind: "env_assignment_secret",
		pattern:
			/\b[A-Z0-9_]*(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PRIVATE[_-]?KEY)[A-Z0-9_]*\s*=\s*[^\s]+/gi,
	},
	{ kind: "openai_key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
	{ kind: "github_token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g },
	{
		kind: "jwt",
		pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
	},
	{ kind: "pem_private_key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
];

/**
 * Scans input text and returns an array of findings where secrets were detected.
 *
 * @param content - The text content string to scan.
 * @returns Array of SecretScanFinding objects.
 */
export function scanForSecrets(content: string): SecretScanFinding[] {
	const findings: SecretScanFinding[] = [];
	for (const { kind, pattern } of SECRET_PATTERNS) {
		pattern.lastIndex = 0;
		let match = pattern.exec(content);
		while (match !== null) {
			findings.push({
				kind,
				index: match.index,
				preview: redactSecretPreview(match[0]),
			});
			match = pattern.exec(content);
		}
	}
	return findings;
}

/**
 * Returns a redacted representation of a secret string, preserving only the edges.
 *
 * @param value - The secret string to redact.
 * @returns A safe redacted string representation.
 */
export function redactSecretPreview(value: string): string {
	const trimmed = value.trim();
	if (trimmed.length <= 8) return "[redacted]";
	return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}
