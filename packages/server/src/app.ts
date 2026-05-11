import { Hono } from "hono";
import { failure } from "./http.js";
import { createApiKeyMiddleware } from "./middleware/auth.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { registerAgentSessionRoutes } from "./routes/agent-sessions.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerMemoryRoutes } from "./routes/memory.js";
import { registerProjectRoutes } from "./routes/projects.js";
import { registerRecallRoutes } from "./routes/recall.js";
import { createInMemoryTekMemoStore } from "./stores/in-memory-store.js";
import type { TekMemoServerOptions } from "./types.js";

export function createTekMemoServer(options: TekMemoServerOptions): Hono {
	const app = new Hono();

	app.use("*", requestIdMiddleware);
	app.onError((error, c) => failure(c, error));
	notFound(app);

	registerHealthRoutes(app, options);

	app.use("/api/v1/*", createApiKeyMiddleware(options));
	registerProjectRoutes(app, options);
	registerMemoryRoutes(app, options);
	registerRecallRoutes(app, options);
	registerAgentSessionRoutes(app, options);

	return app;
}

export function createInMemoryTekMemoServer(
	options: Omit<TekMemoServerOptions, "store"> = {},
): Hono {
	return createTekMemoServer({
		...options,
		store: createInMemoryTekMemoStore({
			defaultProjectId: options.defaultProjectId,
		}),
	});
}

function notFound(app: Hono): void {
	app.notFound((c) =>
		c.json(
			{
				error: {
					code: "not_found",
					message: "Route not found.",
				},
				meta: { requestId: c.get("requestId") },
			},
			404,
		),
	);
}
