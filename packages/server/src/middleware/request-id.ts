import { createMiddleware } from "hono/factory";

declare module "hono" {
	interface ContextVariableMap {
		requestId: string;
	}
}

export const requestIdMiddleware = createMiddleware(async (c, next) => {
	const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
	c.set("requestId", requestId);
	await next();
	c.header("x-request-id", requestId);
});
