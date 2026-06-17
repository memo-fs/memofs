export async function runConcurrent<T>(
	items: readonly T[],
	concurrency: number,
	worker: (item: T) => Promise<void>,
): Promise<void> {
	const queue = [...items];
	const workers = Array.from(
		{ length: Math.min(concurrency, queue.length) },
		async () => {
			while (queue.length > 0) {
				const item = queue.shift();
				if (item !== undefined) {
					await worker(item);
				}
			}
		},
	);

	await Promise.all(workers);
}
