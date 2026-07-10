import { describe, expect, it } from "vitest";
import {
	CORE_MEMORY_FIXTURE,
	MEMORY_FIXTURE_PATHS,
} from "../fixtures/memory-fixtures";
import type { MinimalMemoryStore } from "../types/contracts";

export interface MemoryStoreContractOptions {
	name: string;
	createStore: () => Promise<MinimalMemoryStore> | MinimalMemoryStore;
	cleanup?: () => Promise<void> | void;
	missingReadBehavior?: "throw" | "empty";
}

export function defineMemoryStoreContractTests(
	options: MemoryStoreContractOptions,
): void {
	describe(`${options.name} MemoryStore contract`, () => {
		it("writes and reads text", async () => {
			const store = await options.createStore();
			try {
				await store.write(MEMORY_FIXTURE_PATHS.core, CORE_MEMORY_FIXTURE);
				await expect(
					Promise.resolve(store.read(MEMORY_FIXTURE_PATHS.core)),
				).resolves.toBe(CORE_MEMORY_FIXTURE);
			} finally {
				await options.cleanup?.();
			}
		});

		it("appends text in order", async () => {
			const store = await options.createStore();
			try {
				await store.write(MEMORY_FIXTURE_PATHS.notes, "");
				await store.append(MEMORY_FIXTURE_PATHS.notes, "a");
				await store.append(MEMORY_FIXTURE_PATHS.notes, "b");
				await expect(
					Promise.resolve(store.read(MEMORY_FIXTURE_PATHS.notes)),
				).resolves.toBe("ab");
			} finally {
				await options.cleanup?.();
			}
		});

		it("handles missing reads according to configured behavior", async () => {
			const store = await options.createStore();
			try {
				const result = Promise.resolve(store.read(".memofs/memory/missing.md"));

				if (options.missingReadBehavior === "empty") {
					await expect(result).resolves.toBe("");
				} else {
					await expect(result).rejects.toThrow();
				}
			} finally {
				await options.cleanup?.();
			}
		});

		it("does not corrupt concurrent appends from the same store instance", async () => {
			const store = await options.createStore();
			try {
				await store.write(MEMORY_FIXTURE_PATHS.events, "");
				await Promise.all([
					store.append(MEMORY_FIXTURE_PATHS.events, "1\n"),
					store.append(MEMORY_FIXTURE_PATHS.events, "2\n"),
					store.append(MEMORY_FIXTURE_PATHS.events, "3\n"),
				]);

				const content = await store.read(MEMORY_FIXTURE_PATHS.events);
				expect(content.split("\n").filter(Boolean).sort()).toEqual([
					"1",
					"2",
					"3",
				]);
			} finally {
				await options.cleanup?.();
			}
		});

		it("exists returns true for written files and false for missing files", async () => {
			const store = await options.createStore();
			try {
				await store.write(MEMORY_FIXTURE_PATHS.core, CORE_MEMORY_FIXTURE);
				await expect(
					Promise.resolve(store.exists(MEMORY_FIXTURE_PATHS.core)),
				).resolves.toBe(true);
				const missingResult = Promise.resolve(
					store.exists(".memofs/memory/missing.md"),
				);
				const resolved = await missingResult.catch(() => "threw");
				expect(resolved === false || resolved === "threw").toBe(true);
			} finally {
				await options.cleanup?.();
			}
		});
	});
}
