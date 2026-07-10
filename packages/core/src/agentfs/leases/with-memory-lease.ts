import { AgentfsLeaseError } from "../errors/agentfs-error";
import type { MemoryLeaseManager } from "./memory-lease-manager";

/**
 * Options for executing an operation under a memory lease.
 *
 * @typeParam T - The return type of the operation.
 *
 * @public
 */
export interface WithMemoryLeaseOptions<T> {
	/**
	 * The lease manager to use for acquiring/releasing the lease.
	 */
	leaseManager: MemoryLeaseManager;

	/**
	 * The store ID to acquire the lease on.
	 */
	storeId: string;

	/**
	 * The ID of the lease owner.
	 */
	ownerId: string;

	/**
	 * Time-to-live for the lease in milliseconds.
	 */
	ttlMs: number;

	/**
	 * The operation to execute while the lease is held.
	 */
	operation: () => Promise<T>;
}

/**
 * Executes an operation under a memory lease, ensuring exclusive access.
 *
 * @remarks
 * The lease is automatically released after the operation completes, whether it succeeds or fails.
 *
 * @typeParam T - The return type of the operation.
 * @param options - Configuration for the lease and operation.
 * @returns The result of the operation.
 * @throws {@link AgentfsLeaseError} If the lease cannot be acquired.
 *
 * @public
 */
export async function withMemoryLease<T>(
	options: WithMemoryLeaseOptions<T>,
): Promise<T> {
	const acquired = await options.leaseManager.acquire(
		options.storeId,
		options.ownerId,
		options.ttlMs,
	);

	if (!acquired) {
		throw new AgentfsLeaseError("Could not acquire memory lease.", {
			storeId: options.storeId,
			ownerId: options.ownerId,
		});
	}

	try {
		return await options.operation();
	} finally {
		await options.leaseManager.release(options.storeId, options.ownerId);
	}
}
