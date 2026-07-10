import { KNOWN_SECRET_PREFIX_PATTERNS } from "../core/internal/secret-prefixes";
import type { JsonValue, MemoFSCloudRequestMeta } from "./types";

export interface MemoFSCloudErrorOptions extends MemoFSCloudRequestMeta {
	code: string;
	message: string;
	details?: JsonValue;
	cause?: unknown;
}

export class MemoFSCloudError extends Error {
	readonly code: string;
	readonly status?: number;
	readonly requestId?: string;
	readonly retryAfterMs?: number;
	readonly details?: JsonValue;
	override readonly cause?: unknown;

	constructor(options: MemoFSCloudErrorOptions) {
		super(options.message);
		this.name = new.target.name;
		this.code = options.code;
		this.status = options.status;
		this.requestId = options.requestId;
		this.retryAfterMs = options.retryAfterMs;
		this.details = options.details;
		this.cause = options.cause;
	}
}

export class MemoFsCloudAuthError extends MemoFSCloudError {}
export class MemoFSCloudPermissionError extends MemoFSCloudError {}
export class MemoFsCloudValidationError extends MemoFSCloudError {}
export class MemoFSCloudRateLimitError extends MemoFSCloudError {}
export class MemoFSCloudNotFoundError extends MemoFSCloudError {}
export class MemoFSCloudConflictError extends MemoFSCloudError {}
export class MemoFSCloudServerError extends MemoFSCloudError {}
export class MemoFSCloudNetworkError extends MemoFSCloudError {}
export class MemoFSCloudTimeoutError extends MemoFSCloudError {}
export class MemoFSCloudResponseParseError extends MemoFSCloudError {}
export class MemoFSCloudConfigurationError extends MemoFSCloudError {}

export function createHttpError(
	options: MemoFSCloudErrorOptions,
): MemoFSCloudError {
	switch (options.status) {
		case 400:
		case 422:
			return new MemoFsCloudValidationError(options);
		case 401:
			return new MemoFsCloudAuthError(options);
		case 403:
			return new MemoFSCloudPermissionError(options);
		case 404:
			return new MemoFSCloudNotFoundError(options);
		case 409:
			return new MemoFSCloudConflictError(options);
		case 429:
			return new MemoFSCloudRateLimitError(options);
		default:
			if ((options.status ?? 0) >= 500)
				return new MemoFSCloudServerError(options);
			return new MemoFSCloudError(options);
	}
}

const SECRET_PATTERNS = [
	// MemoFS-specific key prefixes. Legacy prefixes (`mfs_live_`, `tm_live_`)
	// are kept so error redaction stays safe for keys issued before the rename
	// — redaction is additive and must never miss a real token shape in the
	// wild. These do NOT belong in the shared provider-prefix constant (they
	// are MemoFS-internal, not third-party provider keys).
	/tm_[A-Za-z0-9._-]+/g,
	/mfs_live_[A-Za-z0-9._-]+/g,
	/tm_live_[A-Za-z0-9._-]+/g,
	/Bearer\s+[A-Za-z0-9._-]+/gi,
	// Third-party provider prefixes — sourced from the SSOT
	// (`KNOWN_SECRET_PREFIX_PATTERNS`) so adding a new provider there
	// automatically redacts it from error messages too.
	...KNOWN_SECRET_PREFIX_PATTERNS.map((rule) => rule.pattern),
	/pa-[A-Za-z0-9._-]+/g,
];

export function redactSecrets(
	message: string,
	extraSecrets: Array<string | undefined> = [],
): string {
	let output = message;
	for (const pattern of SECRET_PATTERNS)
		output = output.replace(pattern, "[REDACTED]");
	for (const secret of extraSecrets) {
		if (secret?.trim()) output = output.split(secret).join("[REDACTED]");
	}
	return output;
}

export function isMemoFSCloudError(value: unknown): value is MemoFSCloudError {
	return value instanceof MemoFSCloudError;
}
