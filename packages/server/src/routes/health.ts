import type { Hono } from "hono";
import { success } from "../http.js";
import type { TekMemoServerOptions } from "../types.js";

export function registerHealthRoutes(app: Hono, options: TekMemoServerOptions) {
	const health = () => ({
		status: "ok" as const,
		service: "tekmemo-server" as const,
		mode: "self-host" as const,
		version: options.version,
		time: new Date().toISOString(),
	});

	app.get("/health", (c) => success(c, health()));
	app.get("/healthz", (c) => success(c, health()));
	const readiness = async () => {
		const storeReady = await options.store.isReady();
		const queueReady = options.queue ? await options.queue.isReady() : true;
		const objectStoreReady = options.objectStore
			? await options.objectStore.isReady()
			: true;
		const ready = storeReady && queueReady && objectStoreReady;
		return {
			...health(),
			status: ready ? ("ok" as const) : ("degraded" as const),
			checks: {
				store: storeReady ? "ok" : "degraded",
				queue: queueReady ? "ok" : "degraded",
				objectStore: objectStoreReady ? "ok" : "degraded",
			},
			resources: {
				queue: options.queue?.kind ?? "none",
				objectStore: options.objectStore?.kind ?? "none",
			},
		};
	};

	app.get("/readiness", async (c) => success(c, await readiness()));
	app.get("/readyz", async (c) => success(c, await readiness()));
}
