import { describe, expect, test } from "vitest";
import {
	AgentfsLeaseError,
	InMemoryLeaseManager,
	withMemoryLease,
} from "../../src/index";

describe("InMemoryLeaseManager", () => {
	test("blocks conflicting active leases", async () => {
		const manager = new InMemoryLeaseManager();

		await expect(manager.acquire("store-1", "owner-1", 10000)).resolves.toBe(
			true,
		);
		await expect(manager.acquire("store-1", "owner-2", 10000)).resolves.toBe(
			false,
		);
	});

	test("allows re-entrant acquisition by same owner and extends expiry", async () => {
		const now = 100;
		const manager = new InMemoryLeaseManager({ now: () => now });

		await manager.acquire("store-1", "owner-1", 100);
		await manager.acquire("store-1", "owner-1", 500);

		const lease = await manager.getLease("store-1");
		expect(lease?.expiresAt).toBe(600);
	});

	test("allows another owner after lease expiry", async () => {
		let now = 100;
		const manager = new InMemoryLeaseManager({ now: () => now });

		await manager.acquire("store-1", "owner-1", 100);
		now = 201;

		await expect(manager.acquire("store-1", "owner-2", 100)).resolves.toBe(
			true,
		);
	});

	test("release by wrong owner does not release active lease", async () => {
		const manager = new InMemoryLeaseManager();

		await manager.acquire("store-1", "owner-1", 10000);
		await manager.release("store-1", "owner-2");

		await expect(manager.acquire("store-1", "owner-2", 10000)).resolves.toBe(
			false,
		);
	});

	test("extend fails for wrong owner or expired lease", async () => {
		let now = 100;
		const manager = new InMemoryLeaseManager({ now: () => now });

		await manager.acquire("store-1", "owner-1", 100);
		await expect(manager.extend("store-1", "owner-2", 100)).resolves.toBe(
			false,
		);
		now = 201;
		await expect(manager.extend("store-1", "owner-1", 100)).resolves.toBe(
			false,
		);
	});

	test("rejects invalid lease input", async () => {
		const manager = new InMemoryLeaseManager();

		await expect(manager.acquire("", "owner", 100)).rejects.toThrow(
			AgentfsLeaseError,
		);
		await expect(manager.acquire("store", "", 100)).rejects.toThrow(
			AgentfsLeaseError,
		);
		await expect(manager.acquire("store", "owner", 0)).rejects.toThrow(
			AgentfsLeaseError,
		);
		await expect(manager.acquire("store", "owner", Number.NaN)).rejects.toThrow(
			AgentfsLeaseError,
		);
	});
});

describe("withMemoryLease", () => {
	test("runs operation and releases lease", async () => {
		const manager = new InMemoryLeaseManager();

		await expect(
			withMemoryLease({
				leaseManager: manager,
				storeId: "store-1",
				ownerId: "owner-1",
				ttlMs: 1000,
				operation: async () => "done",
			}),
		).resolves.toBe("done");

		await expect(manager.acquire("store-1", "owner-2", 1000)).resolves.toBe(
			true,
		);
	});

	test("releases lease when operation throws", async () => {
		const manager = new InMemoryLeaseManager();

		await expect(
			withMemoryLease({
				leaseManager: manager,
				storeId: "store-1",
				ownerId: "owner-1",
				ttlMs: 1000,
				operation: async () => {
					throw new Error("boom");
				},
			}),
		).rejects.toThrow("boom");

		await expect(manager.acquire("store-1", "owner-2", 1000)).resolves.toBe(
			true,
		);
	});

	test("throws when lease cannot be acquired", async () => {
		const manager = new InMemoryLeaseManager();
		await manager.acquire("store-1", "owner-1", 1000);

		await expect(
			withMemoryLease({
				leaseManager: manager,
				storeId: "store-1",
				ownerId: "owner-2",
				ttlMs: 1000,
				operation: async () => "done",
			}),
		).rejects.toThrow(AgentfsLeaseError);
	});
});
