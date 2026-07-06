/**
 * Output bytes and content size limit enforcement utilities for MCP responses.
 *
 * @module limits
 */

import { McpOutputLimitError } from "../errors";
import type { McpToolResult } from "../types";
import { byteLength } from "./json";

/**
 * Enforces a byte limit on a string, truncating it if it exceeds the limit.
 * Adds a trailing truncation message indicating how many bytes were exceeded.
 *
 * @param text - The text to check and potentially truncate.
 * @param maxBytes - The maximum allowed size in bytes.
 * @param operation - The operation name for logs/errors.
 * @returns The original string if it is within limits, or a truncated string with a notice.
 * @throws {McpOutputLimitError} If the limit is too small to fit even the truncation suffix.
 */
export function enforceOutputLimit(
	text: string,
	maxBytes: number,
	operation: string,
): string {
	const bytes = byteLength(text);
	if (bytes <= maxBytes) return text;
	const suffix = `\n\n[Output truncated by @memofs/core/mcp: ${bytes} bytes exceeded ${maxBytes} bytes for ${operation}.]`;
	const suffixBytes = byteLength(suffix);
	if (suffixBytes >= maxBytes)
		throw new McpOutputLimitError(
			"Output limit is too small to safely return truncation notice.",
			{ operation, bytes, maxBytes },
		);
	let slice = text.slice(0, Math.max(0, maxBytes - suffixBytes));
	while (byteLength(slice) + suffixBytes > maxBytes) slice = slice.slice(0, -1);
	return `${slice}${suffix}`;
}

/**
 * Enforces output byte limits on all text items within an MCP tool result.
 *
 * @param result - The tool result object.
 * @param maxBytes - The maximum allowed byte limit for text content.
 * @param operation - The operation name.
 * @returns The original tool result, or a copy with truncated text elements.
 */
export function enforceToolResultLimit(
	result: McpToolResult,
	maxBytes: number,
	operation: string,
): McpToolResult {
	let changed = false;
	const content = result.content.map((item) => {
		if (item.type !== "text") return item;
		const text = enforceOutputLimit(item.text, maxBytes, operation);
		if (text !== item.text) changed = true;
		return { ...item, text };
	});
	return changed ? { ...result, content } : result;
}
