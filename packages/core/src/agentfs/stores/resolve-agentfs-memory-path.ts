import { assertMemoryPath, type MemoryPath } from "../../core/constants/memory-paths";
import { AgentfsConfigError } from "../errors/agentfs-error";

/**
 * Resolves a memory path to a full remote path within the AgentFS store root.
 *
 * @remarks
 * Validates that the resolved path stays within the `.memofs/` protocol root
 * and does not contain unsafe characters or path traversal sequences.
 *
 * @param root - The store root path.
 * @param memoryPath - The memory path to resolve (e.g., `.memofs/core/core.md`).
 * @returns The resolved absolute remote path.
 * @throws {@link AgentfsConfigError} If the root or resolved path is unsafe.
 *
 * @public
 */
export function resolveAgentfsMemoryPath(
	root: string,
	memoryPath: MemoryPath,
): string {
	if (typeof root !== "string" || root.trim().length === 0) {
		throw new AgentfsConfigError(
			"AgentFS store root must be a non-empty string.",
			{ root },
		);
	}

	if (root.includes("\0") || root.includes("\\")) {
		throw new AgentfsConfigError("AgentFS store root is unsafe.", { root });
	}

	if (root.split("/").some((segment) => segment === "..")) {
		throw new AgentfsConfigError(
			"AgentFS store root must not contain parent directory segments.",
			{ root },
		);
	}

	assertMemoryPath(memoryPath);

	const normalizedRoot = root === "/" ? "" : root.replace(/\/+$/g, "");
	const remotePath = `${normalizedRoot}/${memoryPath}`;

	if (!remotePath.startsWith(`${normalizedRoot}/.memofs/`)) {
		throw new AgentfsConfigError(
			"Resolved AgentFS memory path escaped the .memofs protocol root.",
			{
				root,
				memoryPath,
				remotePath,
			},
		);
	}

	if (
		remotePath.includes("//") ||
		remotePath.includes("\0") ||
		remotePath.includes("\\")
	) {
		throw new AgentfsConfigError("Resolved AgentFS memory path is unsafe.", {
			remotePath,
		});
	}

	return remotePath;
}
