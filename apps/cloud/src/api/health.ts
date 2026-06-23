/**
 * Health & readiness endpoints.
 *
 * Public, unauthenticated liveness/readiness probes for the cloud API
 * (`cloud-sync-and-refactor.md` §12.1). Both return the frozen
 * `TekMemoCloudHealthResult` shape wrapped in the `{ data, meta }` envelope
 * the cloud client transport unwraps (`cloud-client/types.ts`).
 *
 *   GET /v1/health    — liveness: the process is up and answering.
 *   GET /v1/readiness — readiness: liveness + can reach its backing stores.
 *
 * `/health` is cheap and dependency-free (used by load balancers). `/readiness`
 * probes the R2 bucket binding so a deploy that lost its binding fails the
 * readiness gate rather than serving sync traffic it cannot honour.
 */
import { Hono } from "hono";
import type { CloudWorkerEnv } from "../server/env";
import type { ApiEnv } from "./index";
import { json } from "./json";

/** Cloud name + version surfaced in health output. */
const CLOUD_NAME = "tekmemo-cloud";
// `process.env` is legitimate here only for the build-time npm package version;
// at runtime on the Worker this resolves to the bundler-inlined value.
const CLOUD_VERSION = process.env.npm_package_version ?? "0.0.0";
const CAPABILITIES = ["sync.file-replication"];

export const healthApp = new Hono<ApiEnv>()
	.get("/health", (c) =>
		json(c, { ok: true, name: CLOUD_NAME, version: CLOUD_VERSION }),
	)
	.get("/readiness", async (c) => {
		// A readiness probe: the R2 binding must exist and respond to a trivial
		// head() call. Kept defensive — a missing/broken binding fails closed.
		const ok = await canReachR2(c.env);
		const warnings = ok ? undefined : ["r2_unreachable"];
		return json(
			c,
			{
				ok,
				name: CLOUD_NAME,
				version: CLOUD_VERSION,
				capabilities: CAPABILITIES,
				warnings,
			},
			ok ? 200 : 503,
		);
	});

async function canReachR2(env: CloudWorkerEnv): Promise<boolean> {
	try {
		if (!env.BLOBS) return false;
		// A zero-cost probe: head an object key that is never expected to exist.
		// Any non-throwing response (404 included) means the binding is live.
		await env.BLOBS.head("readiness-probe");
		return true;
	} catch {
		return false;
	}
}
