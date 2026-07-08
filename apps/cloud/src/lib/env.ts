/**
 * Runtime secret access — the single source of truth for reading Worker secrets.
 *
 * `wrangler types` generates secrets as optional (`string | undefined`) because
 * it cannot guarantee they're set at the type level. In practice, every secret
 * listed in `wrangler.toml` `[secrets].required` IS set before the Worker
 * handles traffic. This helper enforces that guarantee at runtime: it reads the
 * value, asserts it exists, and returns a narrowed `string`.
 *
 * Usage:
 *   import { secret } from "~/lib/env";
 *   const dbUrl = secret("DATABASE_URL");
 */

import { env } from "cloudflare:workers";

/**
 * Reads a required secret from the Worker env and asserts it is defined.
 *
 * @param key - The secret name (must match a key in `wrangler.toml` `[secrets].required`).
 * @returns The secret value as a `string`.
 * @throws {Error} If the secret is missing or empty at runtime.
 *
 * @example
 * ```ts
 * const dbUrl = secret("DATABASE_URL");
 * const salt = secret("API_KEY_SALT");
 * ```
 */
export function secret(key: keyof Env): string {
	const value = env[key];
	if (typeof value !== "string" || value === "") {
		throw new Error(
			`[env] Missing required secret "${String(key)}". ` +
				`Set it via \`wrangler secret put ${String(key)}\`.`,
		);
	}
	return value;
}
