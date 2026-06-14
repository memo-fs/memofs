/**
 * Command execution for memory operations (view, create, update, search).
 *
 * @remarks
 * Provides a unified interface for executing memory commands against a store.
 * Commands are validated before execution to ensure safety.
 *
 * @public
 */

import {
	assertNonEmptyString,
	assertPositiveInteger,
	assertString,
} from "@repo/utils";
import {
	assertMemoryPath,
	CONVERSATIONS_MEMORY_PATH,
	MEMORY_EVENTS_PATH,
	NOTES_MEMORY_PATH,
} from "../constants/memory-paths";
import { MemoryCommandError } from "../errors/errors";
import { searchMemoryText } from "../search/search-memory";
import type { MemoryCommand } from "../types/memory-commands";
import type { MemoryStore } from "../types/memory-store";

/** Paths that support text search operations. */
const SEARCHABLE_PATHS = new Set<string>([
	NOTES_MEMORY_PATH,
	MEMORY_EVENTS_PATH,
	CONVERSATIONS_MEMORY_PATH,
]);

/**
 * Executes a memory command against a store.
 *
 * @param store - The memory store to operate on.
 * @param command - The command to execute (view, create, update, search).
 * @returns A result message or the content/read result.
 */
export async function runMemoryCommand(
	store: MemoryStore,
	command: MemoryCommand,
): Promise<string> {
	validateMemoryCommand(command);
	assertMemoryPath(command.path);

	switch (command.command) {
		case "view": {
			return store.read(command.path);
		}

		case "create": {
			const alreadyExists = await store.exists(command.path);
			const mode = command.ifExists ?? "error";

			if (alreadyExists && mode === "ignore") {
				return `Skipped create: ${command.path} already exists.`;
			}

			if (alreadyExists && mode === "error") {
				throw new MemoryCommandError(
					`Cannot create ${command.path}: file already exists.`,
					{
						path: command.path,
					},
				);
			}

			await store.write(command.path, command.content);
			return alreadyExists
				? `Overwrote ${command.path}`
				: `Created ${command.path}`;
		}

		case "update": {
			const mode = command.mode ?? "overwrite";
			if (mode === "append") {
				await store.append(command.path, command.content);
			} else {
				await store.write(command.path, command.content);
			}
			return `Updated ${command.path}`;
		}

		case "search": {
			if (!SEARCHABLE_PATHS.has(command.path)) {
				throw new MemoryCommandError(
					`Search is not supported for ${command.path}.`,
					{
						path: command.path,
						supported: [...SEARCHABLE_PATHS],
					},
				);
			}

			const content = await store.read(command.path);
			const results = searchMemoryText({
				content,
				query: command.query,
				limit: command.limit ?? 10,
			});

			if (results.length === 0) return "No matches found.";
			return results.map((result) => result.text).join("\n---\n");
		}
	}
}

/**
 * Validates a memory command before execution.
 *
 * @param command - The command to validate.
 * @throws {@link MemoryCommandError} If the command is invalid.
 */
export function validateMemoryCommand(command: MemoryCommand): void {
	if (typeof command !== "object" || command === null) {
		throw new MemoryCommandError("Memory command must be an object.");
	}

	if (!["view", "create", "update", "search"].includes(command.command)) {
		throw new MemoryCommandError("Unsupported memory command.", {
			command: (command as { command?: unknown }).command,
		});
	}

	assertMemoryPath((command as { path?: unknown }).path);

	if (command.command === "create") {
		assertString(command.content, "content");
		if (
			command.ifExists !== undefined &&
			!["error", "overwrite", "ignore"].includes(command.ifExists)
		) {
			throw new MemoryCommandError("Invalid create ifExists mode.", {
				ifExists: command.ifExists,
			});
		}
	}

	if (command.command === "update") {
		assertString(command.content, "content");
		if (
			command.mode !== undefined &&
			!["append", "overwrite"].includes(command.mode)
		) {
			throw new MemoryCommandError("Invalid update mode.", {
				mode: command.mode,
			});
		}
	}

	if (command.command === "search") {
		assertNonEmptyString(command.query, "query");
		if (command.limit !== undefined)
			assertPositiveInteger(command.limit, "limit");
		if (!SEARCHABLE_PATHS.has(command.path)) {
			throw new MemoryCommandError("Invalid search path.", {
				path: command.path,
			});
		}
	}
}
