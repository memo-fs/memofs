/**
 * Types for memory commands that can be executed against a store.
 *
 * @public
 */

import type {
	CONVERSATIONS_MEMORY_PATH,
	MEMORY_EVENTS_PATH,
	NOTES_MEMORY_PATH,
} from "../constants/memory-paths";
import type { MemoryPath } from "./memory-store";

/**
 * Memory paths that support text search operations.
 * @public
 */
export type SearchableMemoryPath =
	| typeof NOTES_MEMORY_PATH
	| typeof MEMORY_EVENTS_PATH
	| typeof CONVERSATIONS_MEMORY_PATH;

/**
 * A command that can be executed against a memory store.
 *
 * @remarks
 * Supported commands: `view`, `create`, `update`, `search`.
 *
 * @public
 */
export type MemoryCommand =
	| {
			/** View the contents of a memory file. */
			command: "view";
			/** The memory path to read from. */
			path: MemoryPath;
	  }
	| {
			/** Create a new memory file. */
			command: "create";
			/** The memory path to create. */
			path: MemoryPath;
			/** The content to write. */
			content: string;
			/** What to do if the file already exists. @defaultValue "error" */
			ifExists?: "error" | "overwrite" | "ignore";
	  }
	| {
			/** Update an existing memory file. */
			command: "update";
			/** The memory path to update. */
			path: MemoryPath;
			/** The content to write or append. */
			content: string;
			/** Update mode: overwrite (default) or append. */
			mode?: "append" | "overwrite";
	  }
	| {
			/** Search within a memory file for matching text. */
			command: "search";
			/** The memory path to search (must be searchable). */
			path: SearchableMemoryPath;
			/** The search query string. */
			query: string;
			/** Maximum number of results to return. @defaultValue 10 */
			limit?: number;
	  };
