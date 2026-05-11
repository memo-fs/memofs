import type { Hono } from "hono";
import { TekMemoServerValidationError } from "../errors.js";
import { success } from "../http.js";
import type { TekMemoServerOptions } from "../types.js";
import {
	assertObject,
	assertProjectId,
	optionalMemoryKind,
	optionalMetadata,
	optionalString,
	optionalStringArray,
} from "../validation.js";

/**
 * Registers AgentFS session control-plane routes.
 *
 * @param app - Hono app.
 * @param options - Server options.
 */
export function registerAgentSessionRoutes(
	app: Hono,
	options: TekMemoServerOptions,
) {
	app.post("/api/v1/projects/:projectId/agent-sessions", async (c) => {
		const projectId = assertProjectId(c.req.param("projectId"));
		const body = assertObject(await c.req.json(), "body");
		const session = await options.store.createAgentSession({
			projectId,
			sessionId: requiredString(body.sessionId, "sessionId"),
			task: requiredString(body.task, "task"),
			actorId: optionalString(body.actorId),
			workspaceProvider: optionalWorkspaceProvider(body.workspaceProvider),
			workspaceRoot: optionalString(body.workspaceRoot),
			metadata: optionalMetadata(body.metadata),
		});
		return success(c, session, 201);
	});

	app.post(
		"/api/v1/projects/:projectId/agent-sessions/:sessionId/events",
		async (c) => {
			const projectId = assertProjectId(c.req.param("projectId"));
			const sessionId = requiredString(c.req.param("sessionId"), "sessionId");
			const body = assertObject(await c.req.json(), "body");
			const event = await options.store.addAgentSessionEvent({
				projectId,
				sessionId,
				type: requiredString(body.type, "type"),
				message: requiredString(body.message, "message"),
				metadata: optionalMetadata(body.metadata),
				occurredAt: optionalString(body.occurredAt),
			});
			return success(c, event, 201);
		},
	);

	app.post(
		"/api/v1/projects/:projectId/agent-sessions/:sessionId/extract",
		async (c) => {
			const projectId = assertProjectId(c.req.param("projectId"));
			const sessionId = requiredString(c.req.param("sessionId"), "sessionId");
			const body = assertObject(await c.req.json(), "body");
			const extraction = await options.store.extractAgentSessionMemory({
				projectId,
				sessionId,
				summary: optionalString(body.summary) ?? "",
				durableMemory: optionalString(body.durableMemory) ?? "",
				followUps: optionalString(body.followUps) ?? "",
				errors: optionalString(body.errors) ?? "",
				changes: optionalString(body.changes) ?? "",
				checkpointLabel: optionalString(body.checkpointLabel),
			});
			return success(c, extraction, 201);
		},
	);

	app.post(
		"/api/v1/projects/:projectId/agent-sessions/:sessionId/approve-memory",
		async (c) => {
			const projectId = assertProjectId(c.req.param("projectId"));
			const sessionId = requiredString(c.req.param("sessionId"), "sessionId");
			const body = assertObject(await c.req.json(), "body");
			const extraction = await options.store.approveAgentSessionMemory({
				projectId,
				sessionId,
				extractionId: requiredString(body.extractionId, "extractionId"),
				content: optionalString(body.content),
				kind: optionalMemoryKind(body.kind),
				title: optionalString(body.title),
				tags: optionalStringArray(body.tags, "tags"),
				approvedBy: optionalString(body.approvedBy),
			});
			return success(c, extraction);
		},
	);

	app.post(
		"/api/v1/projects/:projectId/agent-sessions/:sessionId/complete",
		async (c) => {
			const projectId = assertProjectId(c.req.param("projectId"));
			const sessionId = requiredString(c.req.param("sessionId"), "sessionId");
			const body = assertObject(await c.req.json(), "body");
			const session = await options.store.completeAgentSession({
				projectId,
				sessionId,
				status: optionalAgentSessionStatus(body.status),
				checkpointLabel: optionalString(body.checkpointLabel),
				completedAt: optionalString(body.completedAt),
			});
			return success(c, session);
		},
	);
}

/**
 * Reads a required string field.
 *
 * @param value - Raw value.
 * @param fieldName - Field name for errors.
 * @returns Trimmed string.
 */
function requiredString(value: unknown, fieldName: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new TekMemoServerValidationError(
			`${fieldName} must be a non-empty string.`,
		);
	}
	return value.trim();
}

/**
 * Validates optional workspace provider input.
 *
 * @param value - Raw provider value.
 * @returns Provider value or undefined.
 */
function optionalWorkspaceProvider(
	value: unknown,
): "agentfs" | "local" | "hosted" | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	if (value !== "agentfs" && value !== "local" && value !== "hosted") {
		throw new TekMemoServerValidationError(
			"workspaceProvider must be agentfs, local, or hosted.",
		);
	}
	return value;
}

/**
 * Validates optional session status input.
 *
 * @param value - Raw status value.
 * @returns Status value or undefined.
 */
function optionalAgentSessionStatus(
	value: unknown,
): "active" | "completed" | "failed" | "abandoned" | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	if (
		value !== "active" &&
		value !== "completed" &&
		value !== "failed" &&
		value !== "abandoned"
	) {
		throw new TekMemoServerValidationError(
			"status must be active, completed, failed, or abandoned.",
		);
	}
	return value;
}
