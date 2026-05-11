import type { Hono } from "hono";
import { TekMemoServerValidationError } from "../errors.js";
import { success } from "../http.js";
import type { TekMemoServerOptions } from "../types.js";
import {
	assertObject,
	assertProjectId,
	optionalPositiveInt,
} from "../validation.js";

export function registerRecallRoutes(app: Hono, options: TekMemoServerOptions) {
	app.post("/api/v1/projects/:projectId/recall/query", async (c) => {
		const projectId = assertProjectId(c.req.param("projectId"));
		const body = assertObject(await c.req.json(), "body");
		if (typeof body.query !== "string" || !body.query.trim()) {
			throw new TekMemoServerValidationError(
				"query must be a non-empty string.",
			);
		}
		const result = await options.store.recall({
			projectId,
			query: body.query,
			topK: optionalPositiveInt(body.topK, "topK"),
		});
		return success(c, result);
	});

	app.post("/api/v1/projects/:projectId/recall/index", async (c) => {
		const projectId = assertProjectId(c.req.param("projectId"));
		if (options.queue) {
			const job = await options.queue.enqueue("recall.index", { projectId });
			return success(
				c,
				{ indexed: 0, mode: "queued" as const, jobId: job.id },
				202,
			);
		}
		const result = await options.store.index({ projectId });
		return success(c, result);
	});
}
