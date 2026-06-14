import { AgentfsConfigError } from "../errors/agentfs-error";

/**
 * Normalizes a root prefix string for use in AgentFS store paths.
 *
 * @remarks
 * Ensures the prefix starts with `/`, collapses multiple slashes, and rejects
 * unsafe characters or path traversal sequences.
 *
 * @param rootPrefix - The raw root prefix (defaults to `"/stores"` if `undefined`).
 * @returns The normalized root prefix string.
 * @throws {@link AgentfsConfigError} If the prefix is invalid or unsafe.
 *
 * @public
 */
export function normalizeRootPrefix(rootPrefix: string | undefined): string {
	const raw = rootPrefix ?? "/stores";

	if (typeof raw !== "string") {
		throw new AgentfsConfigError("rootPrefix must be a string.", {
			valueType: typeof raw,
		});
	}

	const trimmed = raw.trim();

	if (trimmed.length === 0) {
		throw new AgentfsConfigError("rootPrefix must not be empty.", {
			rootPrefix: raw,
		});
	}

	if (trimmed.includes("\0")) {
		throw new AgentfsConfigError("rootPrefix must not contain null bytes.", {
			rootPrefix: raw,
		});
	}

	if (trimmed.includes("\\")) {
		throw new AgentfsConfigError("rootPrefix must use forward slashes only.", {
			rootPrefix: raw,
		});
	}

	const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
	const collapsed = withLeadingSlash.replace(/\/{2,}/g, "/");
	const parts = collapsed.split("/").filter(Boolean);

	if (parts.some((part) => part === "." || part === "..")) {
		throw new AgentfsConfigError(
			"rootPrefix must not contain dot or parent directory segments.",
			{ rootPrefix: raw },
		);
	}

	const normalized =
		collapsed.length > 1 ? collapsed.replace(/\/+$/g, "") : "/";

	if (normalized.includes("..")) {
		throw new AgentfsConfigError(
			"rootPrefix must not contain parent directory semantics.",
			{ rootPrefix: raw },
		);
	}

	return normalized;
}
