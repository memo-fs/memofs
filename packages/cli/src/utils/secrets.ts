export interface SecretScanFinding {
	kind: string;
	index: number;
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

export function redactSecretPreview(value: string): string {
	const trimmed = value.trim();
	if (trimmed.length <= 8) return "[redacted]";
	return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}
