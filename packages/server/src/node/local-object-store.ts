import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type {
	ObjectStore,
	ObjectStorePutOptions,
} from "../storage/object-store.js";
import { normalizeObjectKey } from "../storage/object-store.js";

export interface CreateLocalObjectStoreOptions {
	rootDir: string;
}

export function createLocalObjectStore(
	options: CreateLocalObjectStoreOptions,
): ObjectStore {
	const root = resolve(options.rootDir);
	const resolveKey = (key: string) => {
		const absolute = resolve(join(root, normalizeObjectKey(key)));
		if (!absolute.startsWith(root)) {
			throw new Error("Object key escaped the configured root directory.");
		}
		return absolute;
	};

	return {
		kind: "local",
		async isReady() {
			try {
				await mkdir(root, { recursive: true });
				return true;
			} catch {
				return false;
			}
		},
		async put(key: string, body: Uint8Array, _options?: ObjectStorePutOptions) {
			const path = resolveKey(key);
			await mkdir(dirname(path), { recursive: true });
			await writeFile(path, body);
		},
		async get(key: string) {
			try {
				return await readFile(resolveKey(key));
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
				throw error;
			}
		},
		async delete(key: string) {
			await rm(resolveKey(key), { force: true });
		},
	};
}
