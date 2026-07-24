/**
 * Shared HTTP helpers for real harnesses.
 * Node-only.
 */

import type { IncomingMessage } from "node:http";

/**
 * Reads full request body into Buffer.
 */
export async function readBody(req: IncomingMessage): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on("data", (c: Buffer) => chunks.push(c));
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
}

/**
 * Converts Web Headers to plain object.
 */
export function headersToObject(headers: Headers): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [k, v] of headers.entries()) out[k] = v;
	return out;
}
