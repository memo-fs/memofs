import type { Hono } from "hono";
import { success } from "../http.js";
import type { TekMemoServerOptions } from "../types.js";
import {
	assertObject,
	assertProjectId,
	optionalString,
} from "../validation.js";

export function registerProjectRoutes(
	app: Hono,
	options: TekMemoServerOptions,
) {
	app.get("/api/v1/projects", async (c) => {
		const projects = await options.store.listProjects();
		return success(c, { items: projects });
	});

	app.post("/api/v1/projects", async (c) => {
		const body = assertObject(await c.req.json(), "body");
		const project = await options.store.ensureProject({
			projectId: assertProjectId(body.projectId ?? body.id),
			name: optionalString(body.name),
		});
		return success(c, project, 201);
	});
}
