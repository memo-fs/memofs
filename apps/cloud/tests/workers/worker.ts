import { Hono } from "hono";
import { healthApp } from "../../src/.server/api/health";
import { requestIdMiddleware } from "../../src/.server/api/middleware/request-id";

// Mounts ONLY the health slice the integration suite exercises, not the full
// createApiApp() — see header comment for why the full tree can't load here.
const app = new Hono<{ Bindings: Env }>()
	.use("*", requestIdMiddleware)
	.route("/v1", healthApp);

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return app.fetch(request, env);
	},
};
