/**
 * Text search utilities for memory documents.
 *
 * @remarks
 * Provides simple keyword-based search with support for line-level
 * and markdown section-level splitting. Used by the `search` memory command.
 *
 * @public
 */

import { MemoryValidationError } from "../errors/errors";
import {
	assertNonEmptyString,
	assertPositiveInteger,
} from "../validation/assertions";

/**
 * Options for searching text content.
 */
export interface SearchMemoryTextOptions {
	/** The full text content to search within. */
	content: string;
	/** The search query (keyword or phrase). */
	query: string;
	/** Maximum number of results to return. @defaultValue 10 */
	limit?: number;
	/** Splitting strategy for scoring blocks. @defaultValue "auto" */
	mode?: "auto" | "line" | "markdown-section";
}

/**
 * A single search result with score.
 */
export interface MemorySearchResult {
	/** The matching text block. */
	text: string;
	/** The index of this block in the original content. */
	index: number;
	/** Relevance score (higher = better match). */
	score: number;
}

/**
 * Searches text content for a query string and returns scored results.
 *
 * @param options - Search options including content, query, and limit.
 * @returns Array of search results sorted by score (highest first).
 * @throws {@link MemoryValidationError} If query is empty or content is not a string.
 */
export function searchMemoryText(
	options: SearchMemoryTextOptions,
): MemorySearchResult[] {
	assertNonEmptyString(options.query, "query");

	if (typeof options.content !== "string") {
		throw new MemoryValidationError("content must be a string.", {
			actualType: typeof options.content,
		});
	}

	const limit = options.limit ?? 10;
	assertPositiveInteger(limit, "limit");

	const query = options.query.trim().toLowerCase();
	const blocks = splitSearchBlocks(options.content, options.mode ?? "auto");

	return blocks
		.map((text, index) => ({ text, index, score: scoreBlock(text, query) }))
		.filter((result) => result.score > 0)
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.slice(0, limit);
}

/**
 * Splits content into searchable blocks based on the specified mode.
 *
 * @param content - The text content to split.
 * @param mode - Splitting strategy: "auto" detects markdown sections.
 * @returns Array of text blocks to search within.
 */
export function splitSearchBlocks(
	content: string,
	mode: "auto" | "line" | "markdown-section" = "auto",
): string[] {
	if (mode === "line") return splitLines(content);
	if (mode === "markdown-section") return splitMarkdownSections(content);

	if (/^##\s+/m.test(content)) {
		return splitMarkdownSections(content);
	}

	return splitLines(content);
}

/**
 * Splits text content into individual lines, trimming and filtering empties.
 *
 * @param content - The text content to split.
 * @returns Array of non-empty trimmed lines.
 */
function splitLines(content: string): string[] {
	return content
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

/**
 * Splits markdown content into sections based on `##` headings.
 *
 * @param markdown - The markdown content to split.
 * @returns Array of sections, each starting with a `##` heading.
 */
function splitMarkdownSections(markdown: string): string[] {
	const lines = markdown
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n");
	const sections: string[] = [];
	let current: string[] = [];

	for (const line of lines) {
		if (line.startsWith("## ") && current.length > 0) {
			sections.push(current.join("\n").trim());
			current = [line];
			continue;
		}
		current.push(line);
	}

	if (current.length > 0) sections.push(current.join("\n").trim());
	return sections.filter(Boolean);
}

/**
 * Scores a text block based on query presence and position.
 *
 * @param text - The text block to score.
 * @param loweredQuery - The query string (already lowered).
 * @returns A numeric score (higher = better match).
 */
function scoreBlock(text: string, loweredQuery: string): number {
	const lowered = text.toLowerCase();
	if (!lowered.includes(loweredQuery)) return 0;

	let score = 0;
	let cursor = 0;

	while (true) {
		const found = lowered.indexOf(loweredQuery, cursor);
		if (found === -1) break;
		score += 1;
		cursor = found + loweredQuery.length;
	}

	if (lowered.startsWith(loweredQuery)) score += 2;
	if (lowered.includes(`## ${loweredQuery}`)) score += 3;

	return score;
}
