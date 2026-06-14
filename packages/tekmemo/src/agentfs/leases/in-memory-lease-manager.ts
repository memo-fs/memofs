import { AgentfsLeaseError } from "../errors/agentfs-error";
import type {
	MemoryLeaseManager,
	MemoryLeaseRecord,
} from "./memory-lease-manager";

/**
 * Options for configuring an {@link InMemoryLeaseManager}.
 *
 * @public
 */
export interface InMemoryLeaseManagerOptions {
	/**
	 * Optional custom clock function. Defaults to `Date.now`.
	 * Useful for testing time-dependent behavior.
	 */
	now?: () => number;
}

/**
 * Validates lease input parameters.
 *
 * @param storeId - The store ID to validate.
 * @param ownerId - The owner ID to validate.
 * @param ttlMs - Optional TTL in milliseconds to validate.
 * @throws {@link AgentfsLeaseError} If any parameter is invalid.
 *
 * @internal
 */
function assertLeaseInput(
	storeId: string,
	ownerId: string,
	ttlMs?: number,
): void {
	if (typeof storeId !== "string" || storeId.trim().length === 0) {
		throw new AgentfsLeaseError("storeId must be a non-empty string.", {
			storeId,
		});
	}

	if (typeof ownerId !== "string" || ownerId.trim().length === 0) {
		throw new AgentfsLeaseError("ownerId must be a non-empty string.", {
			ownerId,
		});
	}

	if (ttlMs !== undefined && (!Number.isFinite(ttlMs) || ttlMs <= 0)) {
		throw new AgentfsLeaseError("ttlMs must be a positive finite number.", {
			ttlMs,
		});
	}
}

/**
 * In-memory implementation of {@link MemoryLeaseManager}.
 *
 * @remarks
 * This implementation stores leases in a local `Map`. It is suitable for single-instance
 * scenarios. For distributed scenarios, a different implementation should be used.
 *
 * @public
 */
export class InMemoryLeaseManager implements MemoryLeaseManager {
	private readonly leases = new Map<string, MemoryLeaseRecord>();
	private readonly now: () => number;

	/**
	 * Creates a new InMemoryLeaseManager.
	 *
	 * @param options - Optional configuration for the lease manager.
	 */
	constructor(options: InMemoryLeaseManagerOptions = {}) {
		this.now = options.now ?? (() => Date.now());
	}

	/**
	 * Attempts to acquire a lease on a store.
	 *
	 * @param storeId - The store to acquire the lease on.
	 * @param ownerId - The ID of the lease owner.
	 * @param ttlMs - Time-to-live in milliseconds.
	 * @returns `true` if the lease was acquired, `false` if already held by another owner.
	 *
	 * @public
	 */
	async acquire(
		storeId: string,
		ownerId: string,
		ttlMs: number,
	): Promise<boolean> {
		assertLeaseInput(storeId, ownerId, ttlMs);

		const now = this.now();
		const existing = this.leases.get(storeId);

		if (existing && existing.expiresAt <= now) {
			this.leases.delete(storeId);
		}

		const active = this.leases.get(storeId);
		if (active && active.ownerId !== ownerId) {
			return false;
		}

		this.leases.set(storeId, {
			storeId,
			ownerId,
			expiresAt: now + ttlMs,
		});

		return true;
	}

	/**
	 * Attempts to extend an existing lease.
	 *
	 * @param storeId - The store the lease is on.
	 * @param ownerId - The ID of the lease owner.
	 * @param ttlMs - New time-to-live in milliseconds.
	 * @returns `true` if the lease was extended, `false` otherwise.
	 *
	 * @public
	 */
	async extend(
		storeId: string,
		ownerId: string,
		ttlMs: number,
	): Promise<boolean> {
		assertLeaseInput(storeId, ownerId, ttlMs);
		const existing = this.leases.get(storeId);
		const now = this.now();

		if (
			!existing ||
			existing.expiresAt <= now ||
			existing.ownerId !== ownerId
		) {
			return false;
		}

		this.leases.set(storeId, {
			storeId,
			ownerId,
			expiresAt: now + ttlMs,
		});

		return true;
	}

	/**
	 * Releases a previously acquired lease.
	 *
	 * @param storeId - The store to release the lease on.
	 * @param ownerId - The ID of the lease owner.
	 * @returns A promise that resolves when the lease is released.
	 *
	 * @public
	 */
	async release(storeId: string, ownerId: string): Promise<void> {
		assertLeaseInput(storeId, ownerId);
		const existing = this.leases.get(storeId);

		if (!existing || existing.ownerId !== ownerId) {
			return;
		}

		this.leases.delete(storeId);
	}

	/**
	 * Retrieves the current lease for a store, if any.
	 *
	 * @param storeId - The store to check.
	 * @returns The lease record, or `undefined` if no active lease exists.
	 *
	 * @public
	 */
	async getLease(storeId: string): Promise<MemoryLeaseRecord | undefined> {
		if (typeof storeId !== "string" || storeId.trim().length === 0) {
			throw new AgentfsLeaseError("storeId must be a non-empty string.", {
				storeId,
			});
		}

		const existing = this.leases.get(storeId);
		if (!existing || existing.expiresAt <= this.now()) {
			this.leases.delete(storeId);
			return undefined;
		}

		return { ...existing };
	}
}
