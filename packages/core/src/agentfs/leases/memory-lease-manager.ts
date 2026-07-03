/**
 * Represents an active memory lease held by an owner.
 *
 * @public
 */
export interface MemoryLeaseRecord {
	/**
	 * The store ID this lease is associated with.
	 */
	storeId: string;

	/**
	 * The ID of the owner holding this lease.
	 */
	ownerId: string;

	/**
	 * The timestamp (ms since epoch) when this lease expires.
	 */
	expiresAt: number;
}

/**
 * Interface for managing memory leases.
 * Leases are used to coordinate exclusive access to memory stores.
 *
 * @public
 */
export interface MemoryLeaseManager {
	/**
	 * Attempts to acquire a lease on a store.
	 *
	 * @param storeId - The store to acquire the lease on.
	 * @param ownerId - The ID of the lease owner.
	 * @param ttlMs - Time-to-live in milliseconds.
	 * @returns `true` if the lease was acquired, `false` if already held by another owner.
	 */
	acquire(storeId: string, ownerId: string, ttlMs: number): Promise<boolean>;

	/**
	 * Releases a previously acquired lease.
	 *
	 * @param storeId - The store to release the lease on.
	 * @param ownerId - The ID of the lease owner.
	 * @returns A promise that resolves when the lease is released.
	 */
	release(storeId: string, ownerId: string): Promise<void>;

	/**
	 * Attempts to extend an existing lease. Optional.
	 *
	 * @param storeId - The store the lease is on.
	 * @param ownerId - The ID of the lease owner.
	 * @param ttlMs - New time-to-live in milliseconds.
	 * @returns `true` if the lease was extended, `false` otherwise.
	 */
	extend?(storeId: string, ownerId: string, ttlMs: number): Promise<boolean>;

	/**
	 * Retrieves the current lease for a store, if any. Optional.
	 *
	 * @param storeId - The store to check.
	 * @returns The lease record, or `undefined` if no active lease exists.
	 */
	getLease?(storeId: string): Promise<MemoryLeaseRecord | undefined>;
}
