import type { JsonValue, TekMemoCloudRequestMeta } from "./types";

export interface TekMemoCloudErrorOptions extends TekMemoCloudRequestMeta {
	code: string;
	message: string;
	details?: JsonValue;
	cause?: unknown;
}

export class TekMemoCloudError extends Error {
	readonly code: string;
	readonly status?: number;
	readonly requestId?: string;
	readonly retryAfterMs?: number;
	readonly details?: JsonValue;
	override readonly cause?: unknown;

	constructor(options: TekMemoCloudErrorOptions) {
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

export class TekMemoCloudAuthError extends TekMemoCloudError {}
export class TekMemoCloudPermissionError extends TekMemoCloudError {}
export class TekMemoCloudValidationError extends TekMemoCloudError {}
export class TekMemoCloudRateLimitError extends TekMemoCloudError {}
export class TekMemoCloudNotFoundError extends TekMemoCloudError {}
export class TekMemoCloudConflictError extends TekMemoCloudError {}
export class TekMemoCloudServerError extends TekMemoCloudError {}
export class TekMemoCloudNetworkError extends TekMemoCloudError {}
export class TekMemoCloudTimeoutError extends TekMemoCloudError {}
export class TekMemoCloudResponseParseError extends TekMemoCloudError {}
export class TekMemoCloudConfigurationError extends TekMemoCloudError {}

export function createHttpError(
	options: TekMemoCloudErrorOptions,
): TekMemoCloudError {
	switch (options.status) {
		case 400:
		case 422:
			return new TekMemoCloudValidationError(options);
		case 401:
			return new TekMemoCloudAuthError(options);
		case 403:
			return new TekMemoCloudPermissionError(options);
		case 404:
			return new TekMemoCloudNotFoundError(options);
		case 409:
			return new TekMemoCloudConflictError(options);
		case 429:
			return new TekMemoCloudRateLimitError(options);
		default:
			if ((options.status ?? 0) >= 500)
				return new TekMemoCloudServerError(options);
			return new TekMemoCloudError(options);
	}
}

const SECRET_PATTERNS = [
	/tk_live_[A-Za-z0-9._-]+/g,
	/tm_live_[A-Za-z0-9._-]+/g,
	/Bearer\s+[A-Za-z0-9._-]+/gi,
	/sk-[A-Za-z0-9._-]+/g,
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

export function isTekMemoCloudError(
	value: unknown,
): value is TekMemoCloudError {
	return value instanceof TekMemoCloudError;
}
