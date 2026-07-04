import { expect, test } from "@playwright/test";

/**
 * E2E smoke — the live Worker served by `wrangler dev` (see `playwright.config.ts`
 * `webServer`). This is the broadest testing layer: a real HTTP client driving the
 * bundled + deployed-locally Worker, asserting the request → Hono → binding →
 * response path is live.
 *
 * Kept to health + readiness — the cheap, dependency-light probes that prove the
 * Worker booted and its R2 binding is wired. Deep behavioural coverage lives in
 * the Vitest unit + workers-integration suites; e2e guards the deploy-time
 * integration (build output + wrangler config + bindings) that those suites
 * cannot see.
 */
test.describe("cloud e2e: health + readiness", () => {
	test("GET /v1/health answers ok from the running Worker", async ({
		request,
	}) => {
		const res = await request.get("/v1/health");
		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.data).toMatchObject({ ok: true, name: "tekmemo-cloud" });
	});

	test("GET /v1/readiness reports ok with the R2 binding live", async ({
		request,
	}) => {
		const res = await request.get("/v1/readiness");
		// readiness is 200 only if `env.BLOBS.head(...)` does not throw — i.e. the
		// R2 binding declared in `wrangler.jsonc` is actually wired by wrangler dev.
		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.data.ok).toBe(true);
		expect(body.data.warnings).toBeUndefined();
	});
});
