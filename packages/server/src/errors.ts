export class TekMemoServerError extends Error {
	readonly status: number;
	readonly code: string;
	readonly details?: unknown;

	constructor(
		status: number,
		code: string,
		message: string,
		details?: unknown,
	) {
		super(message);
		this.name = new.target.name;
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

export class TekMemoServerValidationError extends TekMemoServerError {
	constructor(message: string, details?: unknown) {
		super(400, "validation_error", message, details);
	}
}

export class TekMemoServerAuthError extends TekMemoServerError {
	constructor(message = "A valid TekMemo API key is required.") {
		super(401, "unauthorized", message);
	}
}

export class TekMemoServerNotFoundError extends TekMemoServerError {
	constructor(message: string, details?: unknown) {
		super(404, "not_found", message, details);
	}
}
