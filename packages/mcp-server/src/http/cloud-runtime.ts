/**
 * Worker-safe cloud runtime factory for the HTTP MCP adapter.
 *
 * The cloud is a **file replica**, not an engine (see
 * `docs/architecture/cloud-sync-and-refactor.md` §7): it stores byte-for-byte
 * copies of the canonical `.tekmemo/` files and syncs them by path + sha256. The
 * cloud never embeds, recalls, runs graph traversal, extracts memory, or hosts
 * agent sessions — every one of those operations runs in the local runtime
 * against the same files the cloud mirrors.
 *
 * This Worker-safe runtime therefore only implements the operations the cloud
 * actually exposes: `health`, `readiness`, and the three file-sync methods
 * (`syncPush`, `syncPull`, `syncStatus`). All engine-backed operations are left
 * undefined; the MCP tool layer reports them as unsupported for the HTTP/cloud
 * transport (they require the local filesystem provided by the stdio/CLI
 * runtime). This module depends only on the fetch-based TekMemo Cloud client and
 * avoids the local filesystem runtime used by stdio/CLI entrypoints.
 *
 * @module cloud-runtime
 */

import {
	createTekMemoCloudClient,
	type TekMemoCloudClient,
	type TekMemoCloudClientOptions,
} from "@tekmemo/core/cloud-client";
import type { TekMemoHealthResult, TekMemoMcpRuntime } from "../types";

/**
 * Configuration for the Worker-safe TekMemo Cloud MCP runtime.
 *
 * `baseUrl` is optional because it is only needed when this factory constructs
 * its own cloud client; when a `client` is injected, no base URL is required.
 */
export interface TekMemoCloudMcpRuntimeOptions
	extends Omit<TekMemoCloudClientOptions, "defaultProjectId" | "baseUrl"> {
	/** Base URL of the TekMemo Cloud API. Required when `client` is omitted. */
	baseUrl?: string;
	client?: TekMemoCloudClient;
	projectId?: string;
	workspaceId?: string;
	name?: string;
	version?: string;
}

/**
 * Creates a TekMemo MCP runtime backed only by the file-replica cloud surface.
 *
 * Only `health`, `readiness`, and `sync*` are implemented — everything else the
 * cloud does not host is left undefined, so the tool layer rejects those calls.
 *
 * @param options - Cloud client, default project scope, and metadata options.
 * @returns MCP runtime implementation suitable for Web/Worker deployments.
 */
export function createTekMemoCloudMcpRuntime(
	options: TekMemoCloudMcpRuntimeOptions,
): TekMemoMcpRuntime {
	const projectId = options.projectId ?? "default";
	const client =
		options.client ??
		createTekMemoCloudClient({
			baseUrl: requireBaseUrl(options.baseUrl),
			...options,
			defaultProjectId: projectId,
			...(options.workspaceId === undefined
				? {}
				: { defaultWorkspaceId: options.workspaceId }),
		});

	const withProject = <T extends Record<string, unknown>>(
		input: T = {} as T,
	) => ({
		...input,
		projectId: (input.projectId as string | undefined) ?? projectId,
	});

	return {
		async health(signal) {
			const health = await client.health(signal);
			return toHealthResult(
				health,
				options.name ?? "tekmemo-cloud-mcp",
				options.version ?? "0.1.0",
			);
		},

		async readiness(signal) {
			return client.readiness(signal);
		},

		async syncPush(input, signal) {
			return client.sync.push(withProject(input as never), signal);
		},

		async syncPull(input, signal) {
			return client.sync.pull(withProject(input as never), signal);
		},

		async syncStatus(input, signal) {
			return client.sync.status(withProject(input as never), signal);
		},
	};
}

/**
 * Converts a Cloud health response into the runtime health shape.
 *
 * @param health - Cloud health payload.
 * @param name - Runtime fallback name.
 * @param version - Runtime fallback version.
 * @returns TekMemo runtime health result.
 */
function toHealthResult(
	health: Awaited<ReturnType<TekMemoCloudClient["health"]>>,
	name: string,
	version: string,
): TekMemoHealthResult {
	return {
		ok: health.ok,
		name: health.name ?? name,
		version: health.version ?? version,
		// No local engine in the file-replica HTTP runtime, so we don't report a
		// TekMemoRuntimeMode here. Capabilities advertise the sync-only surface.
		capabilities: ["sync"],
		...(health.warnings?.length ? { warnings: health.warnings } : {}),
	};
}

/**
 * Requires a non-empty base URL when no cloud client is injected.
 *
 * @param baseUrl - Candidate base URL.
 * @returns Non-empty base URL.
 */
function requireBaseUrl(baseUrl: string | undefined): string {
	if (typeof baseUrl === "string" && baseUrl.trim().length > 0) return baseUrl;
	throw new Error(
		"baseUrl is required for the TekMemo Cloud runtime when no client is injected.",
	);
}
