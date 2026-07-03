import { NodeFsMemoryStore } from "./node-fs-memory-store";
import type { NodeFsMemoryStoreOptions } from "./types/options";

/**
 * Creates a new NodeFsMemoryStore instance.
 *
 * @param options - Configuration options for the store.
 * @returns A new {@link NodeFsMemoryStore} instance.
 */
export function createNodeFsMemoryStore(
	options: NodeFsMemoryStoreOptions,
): NodeFsMemoryStore {
	return new NodeFsMemoryStore(options);
}
