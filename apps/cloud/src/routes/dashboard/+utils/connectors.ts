/**
 * Shared validation schema for connector CRUD (SC3.3).
 *
 * Used by both the client (`useForm` onValidate) and the route `action`
 * (parseWithZod) so the two sides never disagree.
 */

import { z } from "zod/v4";
import type { ConnectorType } from "~/.server/db/schema";

/** The connector types available at v1 — derived from schema. */
const CONNECTOR_TYPES: readonly ConnectorType[] = ["github", "notion"];

/** Create-connector form schema. */
export const CreateConnectorSchema = z.object({
	intent: z.literal("create"),
	projectId: z.string().min(1, "Project is required."),
	type: z.enum(CONNECTOR_TYPES),
	name: z
		.string()
		.trim()
		.min(1, "Name is required.")
		.max(60, "Name must be 60 characters or fewer."),
	schedule: z.string().trim().min(1).max(40).default("Every 1h"),
	sourceMapping: z.string().trim().max(200).default(""),
	token: z
		.string()
		.trim()
		.min(1, "Token is required.")
		.max(4096, "Token must be 4096 characters or fewer."),
});

/** Update-connector form schema (toggle enabled, edit schedule/mapping). */
export const UpdateConnectorSchema = z.object({
	intent: z.literal("update"),
	id: z.string().min(1),
	name: z.string().trim().min(1).max(60).optional(),
	enabled: z.enum(["true", "false"]).optional(),
	schedule: z.string().trim().min(1).max(40).optional(),
	sourceMapping: z.string().trim().max(200).optional(),
});

/** Delete-connector form schema. */
export const DeleteConnectorSchema = z.object({
	intent: z.literal("delete"),
	id: z.string().min(1),
});

/** Union of all connector mutation schemas. */
export const ConnectorActionSchema = z.discriminatedUnion("intent", [
	CreateConnectorSchema,
	UpdateConnectorSchema,
	DeleteConnectorSchema,
]);
