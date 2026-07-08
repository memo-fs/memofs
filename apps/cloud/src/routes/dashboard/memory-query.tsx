import { StatusCodes } from "http-status-codes";
import { getDB } from "~/.server/db";
import { getAccountUsage, listProjectsForAccount } from "~/.server/queries";
import { createRuntimeClient } from "~/.server/runtime-client";
import { requireUserWithAccount } from "~/.server/session";
import { canRunConsolidation } from "~/lib/entitlements";
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

	const url = new URL(request.url);
	const projectId = url.searchParams.get("projectId");
	const q = url.searchParams.get("q") || "";

	if (!projectId) {
		return Response.json({ items: [], warnings: [] });
	}

	if (!account) return Response.json({ items: [], warnings: [] });

	// Validate ownership
	const owned = await listProjectsForAccount(account.id);
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
	const owned = await listProjectsForAccount(account.id);
	invariantResponse(
		owned.some((p) => p.id === projectId),
		"Unauthorized project access.",
		{ status: StatusCodes.FORBIDDEN },
	);

	invariantResponse(intent === "consolidate", "Unknown intent.");

	// Q19 entitlement enforcement: refuse the run when the account has already
	// consumed its daily consolidation budget. Checked here (server-side, before
	// the runtime call) rather than client-side so a hand-crafted POST can't
	// bypass the cap. `account.plan` is the plan enum; `canRunConsolidation` is
	// numeric (ADR 0006 §12.3) — `Infinity` (Teams) always satisfies.
	const plan = account.plan ?? "free";
	if (account) {
		const usage = await getAccountUsage(account.id);
		if (!canRunConsolidation(plan, usage.consolidationUsedToday)) {
			return Response.json(
				{
					ok: false,
					error: "Daily consolidation limit reached. Your budget resets at 00:00 UTC.",
				},
				{ status: StatusCodes.TOO_MANY_REQUESTS },
			);
		}
	}

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
