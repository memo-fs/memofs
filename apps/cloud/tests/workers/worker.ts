import { Hono } from "hono";
import { healthApp } from "../../src/api/health";
import { requestIdMiddleware } from "../../src/api/middleware/request-id";
import type { CloudWorkerEnv } from "../../src/server/env";

// Mounts ONLY the health slice the integration suite exercises, not the full
// createApiApp() — see header comment for why the full tree can't load here.
const app = new Hono<{ Bindings: CloudWorkerEnv }>()
	.use("*", requestIdMiddleware)
	.route("/v1", healthApp);

export default {
	async fetch(request: Request, env: CloudWorkerEnv): Promise<Response> {
		return app.fetch(request, env);
	},
};
