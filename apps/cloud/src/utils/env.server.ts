import { createEnv } from "@t3-oss/env-core";
import * as z from "zod/v4";

export const env = createEnv({
	server: {
		NODE_ENV: z.enum(["development", "test", "production"]),
		MOCKS: z.enum(["true", "false"]).optional(),
		LOG_LEVEL: z
			.enum(["fatal", "error", "warn", "info", "debug", "trace"])
			.optional(),
		DATABASE_URL: z.url(),
		DATABASE_AUTH_TOKEN: z.url().optional(),
		SESSION_SECRET: z.string(),
		CSRF_TOKEN: z.string(),
	},

	/**
	 * The prefix that client-side variables must have. This is enforced both at
	 * a type-level and at runtime.
	 */
	clientPrefix: "VITE_",

	client: {},

	/**
	 * What object holds the environment variables at runtime. This is usually
	 * `process.env` or `import.meta.env`.
	 */
	runtimeEnv: process.env,

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined: true,
});
