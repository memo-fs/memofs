import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { ApiError, EntitlementError, NotFoundError } from "../src/api/errors";
import { createApiApp, type ApiEnv } from "../src/api";
import { json, jsonError } from "../src/api/json";
import type { CloudWorkerEnv } from "../src/server/env";

/**
 * Tests for the cloud API spine: requestId middleware, the `{ data, meta }` /
 * `{ error, meta }` envelope contract, and the global notFound/onError handlers.
 *
 * These assert the WIRE SHAPE the published `@tekbreed/tekmemo/cloud-client`
 * transport unwraps (`isSuccessEnvelope` / `isErrorEnvelope` in
 * `cloud-client/transport.ts`) — not internal call signatures — so a change to
 * the envelope fails here before it reaches a published client.
 *
 * We exercise the spine through a tiny throwaway Hono app that mounts a probe
 * route under the real `createApiApp()` middleware + handlers, plus the real
 * health routes. This mirrors how P2.2/P2.3 sync routes will compose in.
 */

/**
 * Structural view of an envelope used only for assertions in this file. Under
 * `@cloudflare/workers-types`, `Response.json()` resolves to `unknown` (stricter
 * than lib.dom's `any`), so we parse through this combined shape — `data` OR
 * `error` set, never both — letting each test reach whichever branch it's
 * asserting without discriminated-union narrowing getting in the way. The
 * fields mirror `TekMemoCloudSuccessEnvelope` / `TekMemoCloudErrorEnvelope`
 * exactly; `meta` is always present (the `json()` helpers set it on every path).
 */
type WireEnvelope = {
	data?: Record<string, unknown>;
	error?: { code: string; message: string; details?: unknown };
	meta: { requestId?: string; [key: string]: unknown };
};

/** Parses a response body into the structural envelope view above. */
async function jsonBody(res: Response): Promise<WireEnvelope> {
	return (await res.json()) as WireEnvelope;
}

const STUB_ENV = {
	BLOBS: {
		async head() {
			return null;
		},
	},
} as unknown as CloudWorkerEnv;

/** Fetch a request against the real API app + bindings. */
async function fetchApi(
	app: Hono<ApiEnv>,
	path: string,
	init?: RequestInit,
): Promise<Response> {
	const res = await app.fetch(new Request(`http://tekmemo.test${path}`, init), STUB_ENV);
	return res as unknown as Response;
}

/** Builds an API app with one extra probe route for envelope/error tests. */
function appWithProbe() {
	const app = createApiApp();
	// Reach into the Hono instance and add a probe route at /v1/__probe/* to
	// exercise json/jsonError/throw without touching health. (createApiApp
	// already wired notFound + onError, so throws here hit the real handler.)
	app.get("/v1/__probe/ok", (c) => json(c, { hello: "world" }));
	app.get("/v1/__probe/throw-api", () => {
		throw new NotFoundError("probe-missing");
	});
	app.get("/v1/__probe/throw-entitlement", () => {
		throw new EntitlementError("storage full", {
			limit: "storage",
			used: 1_000_000_000,
			requested: 2_000_000_000,
			max: 1_000_000_000,
			plan: "free",
		});
	});
	app.get("/v1/__probe/throw-unexpected", () => {
		throw new Error("boom-from-handler");
	});
	app.get("/v1/__probe/json-error", (c) =>
		jsonError(c, 418, "teapot", "I'm a teapot"),
	);
	return app;
}

describe("api envelope contract", () => {
	it("wraps success payloads in { data, meta } and sets x-request-id", async () => {
		const res = await fetchApi(appWithProbe(), "/v1/__probe/ok");
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body).toEqual({
			data: { hello: "world" },
			meta: { requestId: expect.any(String) },
		});
		// The id mints via the requestId middleware must be echoed on the response
		// header so the client transport can read it back.
		const headerId = res.headers.get("x-request-id");
		expect(headerId).toBeTypeOf("string");
		expect(headerId).toBe(body.meta.requestId);
	});

	it("returns a 404 envelope for unknown /v1/* routes", async () => {
		const res = await fetchApi(appWithProbe(), "/v1/does-not-exist");
		expect(res.status).toBe(404);
		const body = await jsonBody(res);
		expect(body).toEqual({
			error: { code: "not_found", message: "Unknown API route." },
			meta: { requestId: expect.any(String) },
		});
		expect(res.headers.get("x-request-id")).toBeTypeOf("string");
	});

	it("serializes a thrown ApiError into the { error, meta } envelope", async () => {
		const res = await fetchApi(appWithProbe(), "/v1/__probe/throw-api");
		expect(res.status).toBe(404);
		const body = await jsonBody(res);
		expect(body.error).toEqual({ code: "not_found", message: "probe-missing" });
		expect(body.meta.requestId).toBeTypeOf("string");
	});

	it("serializes an EntitlementError (402) with its structured details", async () => {
		const res = await fetchApi(appWithProbe(), "/v1/__probe/throw-entitlement");
		expect(res.status).toBe(402);
		const body = await jsonBody(res);
		expect(body.error).toMatchObject({
			code: "entitlement_limit_exceeded",
			message: "storage full",
			details: {
				limit: "storage",
				used: 1_000_000_000,
				requested: 2_000_000_000,
				max: 1_000_000_000,
				plan: "free",
			},
		});
	});

	it("masks unexpected throws with a generic 500 and never leaks the message", async () => {
		const res = await fetchApi(appWithProbe(), "/v1/__probe/throw-unexpected");
		expect(res.status).toBe(500);
		const body = await jsonBody(res);
		expect(body.error).toEqual({
			code: "internal_error",
			message: "Internal server error.",
		});
		const text = JSON.stringify(body);
		// The real throw message must NOT appear anywhere in the response body.
		expect(text).not.toContain("boom-from-handler");
	});

	it("jsonError() returns a structured envelope with the given status/code", async () => {
		const res = await fetchApi(appWithProbe(), "/v1/__probe/json-error");
		expect(res.status).toBe(418);
		const body = await jsonBody(res);
		expect(body.error).toEqual({ code: "teapot", message: "I'm a teapot" });
	});
});

describe("requestId middleware", () => {
	it("honors an inbound x-request-id header and echoes it back", async () => {
		const inbound = "test-trace-1234";
		const res = await fetchApi(appWithProbe(), "/v1/__probe/ok", {
			headers: { "x-request-id": inbound },
		});
		const body = await jsonBody(res);
		expect(res.headers.get("x-request-id")).toBe(inbound);
		expect(body.meta.requestId).toBe(inbound);
	});

	it("rejects an invalid inbound id and mints a fresh uuid instead", async () => {
		// Contains a space → not header-safe per our allow-list.
		const res = await fetchApi(appWithProbe(), "/v1/__probe/ok", {
			headers: { "x-request-id": "bad id with spaces" },
		});
		const body = await jsonBody(res);
		const id = res.headers.get("x-request-id");
		expect(id).not.toBe("bad id with spaces");
		expect(id).toBe(body.meta.requestId);
		// Minted ids are uuids: 36 chars, 4 dashes.
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
	});

	it("mints a fresh uuid when no inbound header is present", async () => {
		const res = await fetchApi(appWithProbe(), "/v1/__probe/ok");
		const id = res.headers.get("x-request-id");
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
	});
});

describe("health endpoints (through the envelope)", () => {
	it("GET /v1/health returns the { data, meta } envelope with ok:true", async () => {
		const res = await fetchApi(createApiApp(), "/v1/health");
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body.data).toMatchObject({
			ok: true,
			name: "tekmemo-cloud",
		});
		// `toMatchObject` above establishes `data` is present; the non-null assertion
		// carries that runtime fact to the type system for the following access.
		expect(body.data!.version).toBeTypeOf("string");
		expect(body.meta.requestId).toBeTypeOf("string");
	});

	it("GET /v1/readiness reports ok:false + r2_unreachable when BLOBS.head throws", async () => {
		// Stub env where head() rejects — readiness must fail closed, not 500.
		const throwingEnv = {
			BLOBS: { async head() {
				throw new Error("binding gone");
			} },
		} as unknown as CloudWorkerEnv;
		const res = await createApiApp().fetch(
			new Request("http://tekmemo.test/v1/readiness"),
			throwingEnv,
		);
		expect(res.status).toBe(503);
		const body = await jsonBody(res);
		expect(body.data).toMatchObject({
			ok: false,
			capabilities: ["sync.file-replication"],
			warnings: ["r2_unreachable"],
		});
	});
});

describe("ApiError hierarchy", () => {
	it("default hideMessage is true only for 5xx", () => {
		expect(new ApiError({ code: "x", message: "m", status: 500 }).hideMessage).toBe(true);
		expect(new ApiError({ code: "x", message: "m", status: 400 }).hideMessage).toBe(false);
	});

	it("EntitlementError keeps its 402 status and structured details", () => {
		const err = new EntitlementError("full", {
			limit: "storage",
			used: 1,
			requested: 2,
			max: 1,
			plan: "free",
		});
		expect(err.status).toBe(402);
		expect(err.code).toBe("entitlement_limit_exceeded");
		expect(err.hideMessage).toBe(false); // 4xx → message shown
	});
});
