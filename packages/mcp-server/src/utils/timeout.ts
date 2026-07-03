/**
 * Timeout wrapping utility for asynchronous operations.
 *
 * @module timeout
 */

import { McpTimeoutError } from "../errors";

/**
 * Executes an asynchronous function with a timeout limit.
 * If the function does not resolve within the specified limit, the abort signal is triggered and a timeout error is thrown.
 *
 * @template T - The return type of the wrapped function.
 * @param operation - Name of the operation being executed, for error detail reporting.
 * @param timeoutMs - Max execution time limit in milliseconds.
 * @param run - The async callback function to execute.
 * @returns The resolved output of the callback function.
 * @throws {McpTimeoutError} If the execution duration exceeds timeoutMs.
 */
export async function withTimeout<T>(
	operation: string,
	timeoutMs: number,
	run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
	const controller = new AbortController();
	let timer: NodeJS.Timeout | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			controller.abort();
			reject(
				new McpTimeoutError(`${operation} timed out after ${timeoutMs}ms.`),
			);
		}, timeoutMs);
	});
	try {
		return await Promise.race([run(controller.signal), timeout]);
	} catch (error) {
		if (error instanceof McpTimeoutError) throw error;
		if (controller.signal.aborted)
			throw new McpTimeoutError(`${operation} timed out after ${timeoutMs}ms.`);
		throw error;
	} finally {
		if (timer) clearTimeout(timer);
	}
}
