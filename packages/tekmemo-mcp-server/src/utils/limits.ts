import { McpOutputLimitError } from "../errors";
import type { McpToolResult } from "../types";
import { byteLength } from "./json";

export function enforceOutputLimit(
	text: string,
	maxBytes: number,
	operation: string,
): string {
	const bytes = byteLength(text);
	if (bytes <= maxBytes) return text;
	const suffix = `\n\n[Output truncated by @tekbreed/tekmemo/mcp: ${bytes} bytes exceeded ${maxBytes} bytes for ${operation}.]`;
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
