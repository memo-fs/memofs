import { createMiddleware } from "hono/factory";
import { TekMemoServerAuthError } from "../errors.js";
import type { TekMemoServerOptions } from "../types.js";

export function createApiKeyMiddleware(options: TekMemoServerOptions) {
	const acceptedKeys = new Set(options.apiKeys ?? []);
	const requireApiKey = options.requireApiKey ?? acceptedKeys.size > 0;

	return createMiddleware(async (c, next) => {
		if (!requireApiKey) {
			await next();
			return;
		}

		const authorization = c.req.header("authorization") ?? "";
		const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
		const headerKey = c.req.header("x-tekmemo-api-key");
		const apiKey = bearer ?? headerKey;

		if (!apiKey || !acceptedKeys.has(apiKey)) {
			throw new TekMemoServerAuthError();
		}

		await next();
	});
}
