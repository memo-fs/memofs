/**
 * Connector framework errors.
 *
 * @public
 */

/**
 * Base class for connector-framework errors. Carries a stable `code` so callers
 * can branch without string-matching messages.
 *
 * @public
 */
export class ConnectorError extends Error {
	readonly code: string;

	constructor(code: string, message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = this.constructor.name;
		this.code = code;
	}
}

/**
 * Thrown when `.memofs/connectors.json` is missing, malformed, or contains an
 * invalid connector row (e.g. a leaked token field).
 *
 * @public
 */
export class ConnectorConfigError extends ConnectorError {
	constructor(message: string, options?: { cause?: unknown }) {
		super("CONNECTOR_CONFIG_ERROR", message, options);
	}
}

/**
 * Thrown by a {@link SecretResolver} when a `secretRef` cannot be resolved
 * (missing file, missing ref, unreadable). Never include the token value in
 * the message.
 *
 * @public
 */
export class ConnectorSecretError extends ConnectorError {
	readonly secretRef: string;

	constructor(
		secretRef: string,
		message: string,
		options?: { cause?: unknown },
	) {
		super("CONNECTOR_SECRET_ERROR", message, options);
		this.secretRef = secretRef;
	}
}
