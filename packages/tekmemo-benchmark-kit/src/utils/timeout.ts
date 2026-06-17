import { BenchmarkTimeoutError } from "../errors/benchmark-errors";

export async function withTimeout<T>(
	operation: (signal?: AbortSignal) => Promise<T> | T,
	timeoutMs?: number,
): Promise<T> {
	if (timeoutMs === undefined) {
		return operation(undefined);
	}

	const controller = new AbortController();

	let timeout: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_resolve, reject) => {
		timeout = setTimeout(() => {
			controller.abort();
			reject(
				new BenchmarkTimeoutError(
					`Benchmark iteration timed out after ${timeoutMs}ms.`,
				),
			);
		}, timeoutMs);
	});

	try {
		return await Promise.race([
			Promise.resolve(operation(controller.signal)),
			timeoutPromise,
		]);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}
