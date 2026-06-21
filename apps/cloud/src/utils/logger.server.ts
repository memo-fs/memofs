/**
 * Shared Logger using Pino
 *
 * Provides structured JSON logging with:
 * - Environment-aware log levels (debug in dev, info in prod)
 * - Automatic redaction of sensitive fields
 * - Pretty printing in development
 * - Child loggers for module context
 */

import pino from "pino";
import { env } from "./env.server";

// Environment detection
const MODE = env.NODE_ENV;

/**
 * Base logger instance
 * - Uses JSON output in production for log aggregation
 * - Uses pino-pretty in development for readability
 */
export const logger = pino({
	level: env.LOG_LEVEL || (MODE === "development" ? "debug" : "info"),

	// Redact sensitive fields to prevent accidental logging
	redact: {
		paths: [
			"password",
			"*.password",
			"token",
			"*.token",
			"secret",
			"*.secret",
			"hash",
			"*.hash",
			"otp",
			"*.otp",
			"code",
			"*.code",
			"accessToken",
			"*.accessToken",
		],
		censor: "[REDACTED]",
	},

	// Disable logging in tests to avoid noisy output
	enabled: MODE !== "test",

	// Pretty print in development only
	transport:
		MODE === "development"
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "HH:MM:ss",
						ignore: "pid,hostname",
					},
				}
			: undefined,
});

/**
 * Create a child logger with module context
 *
 * @example
 * ```ts
 * const log = createLogger("auth")
 * log.info({ userId: "123" }, "user_signed_in")
 * ```
 */
export function createLogger(module: string) {
	return logger.child({ module });
}

export type Logger = ReturnType<typeof createLogger>;
