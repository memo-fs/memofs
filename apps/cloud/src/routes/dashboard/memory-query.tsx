import { StatusCodes } from "http-status-codes";
import { getDB } from "~/.server/db";
import { listProjectsForAccount } from "~/.server/queries";
import { createRuntimeClient } from "~/.server/runtime-client";
import { requireUserWithAccount } from "~/.server/session";
import { invariantResponse } from "~/utils/misc";
import type { Route } from "./+types/memory-query";

/**
 * Memory query resource route.
 * Handles GET requests to retrieve memories (recent or recalled via semantic query)
 * and POST requests to run consolidation on the selected project.
 */
export async function loader({
	request,
}: Route.LoaderArgs): Promise<Response> {
	const { account } = await requireUserWithAccount(request);
	const db = getDB();

	const url = new URL(request.url);
	const projectId = url.searchParams.get("projectId");
	const q = url.searchParams.get("q") || "";

	if (!projectId) {
		return Response.json({ items: [], warnings: [] });
	}

	if (!account) return Response.json({ items: [], warnings: [] });

	// Validate ownership
	const owned = await listProjectsForAccount(db, account.id);
	if (!owned.some((p) => p.id === projectId)) {
		return Response.json({ items: [], warnings: [] });
	}

	try {
		const runtimeClient = createRuntimeClient();
		if (q.trim()) {
			const recallResult = await runtimeClient.recall(projectId, q);
			return Response.json(recallResult);
		}
		const recentResult = await runtimeClient.listRecent(projectId, {
			limit: 20,
		});
		return Response.json(recentResult);
	} catch (err) {
		return Response.json({
			items: [],
			warnings: [err instanceof Error ? err.message : String(err)],
		});
	}
}

export async function action({
	request,
}: Route.ActionArgs): Promise<Response> {
	const { account } = await requireUserWithAccount(request);
	const db = getDB();

	const form = await request.formData();
	const projectId = String(form.get("projectId") ?? "");
	const intent = String(form.get("intent") ?? "");

	if (!projectId || !account) {
		return Response.json(
			{ ok: false, error: "Missing workspace, account, or project." },
			{ status: StatusCodes.BAD_REQUEST },
		);
	}

	// Validate ownership
	const owned = await listProjectsForAccount(db, account.id);
	invariantResponse(
		owned.some((p) => p.id === projectId),
		"Unauthorized project access.",
		{ status: StatusCodes.FORBIDDEN },
	);

	invariantResponse(intent === "consolidate", "Unknown intent.");

	try {
		const runtimeClient = createRuntimeClient();
		const result = await runtimeClient.consolidate(projectId, {
			apply: true,
		});
		return Response.json({ ok: true, result });
	} catch (err) {
		return Response.json({
			ok: false,
			error: err instanceof Error ? err.message : String(err),
		});
	}
}
