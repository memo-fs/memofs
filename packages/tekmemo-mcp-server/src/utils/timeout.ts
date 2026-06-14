import { McpTimeoutError } from "../errors";

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
