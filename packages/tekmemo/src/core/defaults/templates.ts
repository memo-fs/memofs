/**
 * Default templates for canonical TekMemo files.
 *
 * @remarks
 * These templates are used when bootstrapping a new TekMemo project.
 * They provide sensible defaults for core.md, notes.md, and all JSONL files.
 *
 * @public
 */

import { createDefaultTekMemoManifest } from "../manifest/manifest";

export const DEFAULT_CORE_MEMORY = `# Core Memory

This file stores durable, high-signal memory for the current agent/project.

## Identity
- Project: Unknown

## Stable Facts
- Add stable facts here.

## Preferences
- Add durable preferences here.

## Constraints
- Add durable constraints here.
`;

export const DEFAULT_NOTES_MEMORY = `# Notes

Use this file for lower-confidence notes, observations, and working memory.
`;

export const DEFAULT_JSONL = "";

export interface MemoryTemplates {
	manifest: string;
	core: string;
	notes: string;
	memoryEvents: string;
	conversations: string;
	chunks: string;
	graphNodes: string;
	graphEdges: string;
	snapshots: string;
}

/**
 * Creates default memory templates for bootstrapping.
 *
 * @param options - Options including projectId and custom clock.
 * @returns A {@link MemoryTemplates} object with defaults.
 */
export function createDefaultMemoryTemplates(
	options: { projectId?: string; now?: () => string } = {},
): MemoryTemplates {
	return {
		manifest: `${JSON.stringify(createDefaultTekMemoManifest(options), null, 2)}\n`,
		core: DEFAULT_CORE_MEMORY,
		notes: DEFAULT_NOTES_MEMORY,
		memoryEvents: DEFAULT_JSONL,
		conversations: DEFAULT_JSONL,
		chunks: DEFAULT_JSONL,
		graphNodes: DEFAULT_JSONL,
		graphEdges: DEFAULT_JSONL,
		snapshots: DEFAULT_JSONL,
	};
}

export const DEFAULT_MEMORY_TEMPLATES: MemoryTemplates = Object.freeze(
	createDefaultMemoryTemplates(),
);

/** @deprecated Use DEFAULT_JSONL. */
export const DEFAULT_CONVERSATIONS_MEMORY = DEFAULT_JSONL;
/** @deprecated Use DEFAULT_CORE_MEMORY. */
export { DEFAULT_CORE_MEMORY as DEFAULT_MEMORY_CORE };
