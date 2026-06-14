/**
 * Serializes concurrent operations on the same path key.
 *
 * @remarks
 * Maintains a queue of pending operations per key. Operations on the same key
 * are executed sequentially, while operations on different keys run concurrently.
 *
 * @internal
 */
export class PathLock {
	private readonly queues = new Map<string, Promise<void>>();

	/**
	 * Runs an operation exclusively for the given key.
	 *
	 * @typeParam T - The return type of the operation.
	 * @param key - The path key to lock on.
	 * @param operation - The async operation to execute.
	 * @returns The result of the operation.
	 */
	async runExclusive<T>(key: string, operation: () => Promise<T>): Promise<T> {
		const previous = this.queues.get(key) ?? Promise.resolve();

		let release!: () => void;
		const next = new Promise<void>((resolve) => {
			release = resolve;
		});

		this.queues.set(
			key,
			previous.then(
				() => next,
				() => next,
			),
		);

		await previous.catch(() => undefined);

		try {
			return await operation();
		} finally {
			release();
			if (this.queues.get(key) === next) {
				this.queues.delete(key);
			}
		}
	}
}
