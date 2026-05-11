export interface ObjectStorePutOptions {
	contentType?: string;
	metadata?: Record<string, string>;
}

export interface ObjectStoreSignedUrlOptions {
	method?: "GET" | "PUT";
	expiresInSeconds?: number;
	contentType?: string;
}

export interface ObjectStore {
	readonly kind: string;
	isReady(): Promise<boolean>;
	put(
		key: string,
		body: Uint8Array,
		options?: ObjectStorePutOptions,
	): Promise<void>;
	get(key: string): Promise<Uint8Array | null>;
	delete(key: string): Promise<void>;
	createSignedUrl?(
		key: string,
		options?: ObjectStoreSignedUrlOptions,
	): Promise<string>;
}

export function normalizeObjectKey(key: string): string {
	const normalized = key.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
	if (!normalized || normalized.includes("..")) {
		throw new Error("Object key must be non-empty and cannot contain '..'.");
	}
	return normalized;
}
