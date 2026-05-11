import type { Hono } from "hono";
import {
	TekMemoServerNotFoundError,
	TekMemoServerValidationError,
} from "../errors.js";
import { success } from "../http.js";
import type { TekMemoServerOptions } from "../types.js";
import {
	assertObject,
	assertProjectId,
	optionalConfidence,
	optionalMemoryKind,
	optionalMetadata,
	optionalPositiveInt,
	optionalString,
	optionalStringArray,
} from "../validation.js";

export function registerMemoryRoutes(app: Hono, options: TekMemoServerOptions) {
	app.get("/api/v1/projects/:projectId/memory/core", async (c) => {
		const projectId = assertProjectId(c.req.param("projectId"));
		const core = await options.store.readCore(projectId);
		return success(c, core);
	});

	app.put("/api/v1/projects/:projectId/memory/core", async (c) => {
		const projectId = assertProjectId(c.req.param("projectId"));
		const body = assertObject(await c.req.json(), "body");
		if (typeof body.content !== "string") {
			throw new TekMemoServerValidationError("content must be a string.");
		}
		const core = await options.store.updateCore({
			projectId,
			content: body.content,
		});
		return success(c, core);
	});

	app.get("/api/v1/projects/:projectId/memory/notes", async (c) => {
		const projectId = assertProjectId(c.req.param("projectId"));
		const page = await options.store.listNotes({
			projectId,
			limit: optionalPositiveInt(c.req.query("limit"), "limit"),
			cursor: optionalString(c.req.query("cursor")),
			kind: optionalMemoryKind(c.req.query("kind")),
			tag: optionalString(c.req.query("tag")),
		});
		return success(c, page);
	});

	app.post("/api/v1/projects/:projectId/memory/notes", async (c) => {
		const projectId = assertProjectId(c.req.param("projectId"));
		const body = assertObject(await c.req.json(), "body");
		if (typeof body.content !== "string" || !body.content.trim()) {
			throw new TekMemoServerValidationError(
				"content must be a non-empty string.",
			);
		}
		const note = await options.store.createNote({
			projectId,
			kind: optionalMemoryKind(body.kind),
			title: optionalString(body.title),
			content: body.content,
			tags: optionalStringArray(body.tags, "tags"),
			confidence: optionalConfidence(body.confidence),
			source: optionalString(body.source),
			metadata: optionalMetadata(body.metadata),
		});
		return success(c, note, 201);
	});

	app.delete("/api/v1/projects/:projectId/memory/notes/:noteId", async (c) => {
		const projectId = assertProjectId(c.req.param("projectId"));
		const noteId = c.req.param("noteId");
		const result = await options.store.deleteNote({ projectId, noteId });
		if (!result.deleted)
			throw new TekMemoServerNotFoundError("Memory note not found.");
		return success(c, result);
	});
}
