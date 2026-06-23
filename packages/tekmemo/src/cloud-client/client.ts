declare const process: { env?: Record<string, string | undefined> } | undefined;

import { TekMemoCloudTransport } from "./transport";
import type {
	ProjectScopedInput,
	SyncPullInput,
	SyncPullResult,
	SyncPushCompleteInput,
	SyncPushCompleteResult,
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
	TekMemoCloudClient,
	TekMemoCloudClientOptions,
	TekMemoCloudHealthResult,
} from "./types";
import {
	assertProjectId,
	compactQuery,
	validateSyncPullInput,
	validateSyncPushCompleteInput,
	validateSyncPushInput,
	validateSyncStatusInput,
} from "./validation";

/**
 * Creates the frozen v1 cloud client surface. The cloud is a file replica, so
 * the only methods are `health`, `readiness`, and the four file-based sync
 * methods (`sync.push`, `sync.complete`, `sync.pull`, `sync.status`). There are
 * no hosted engine operations — recall, memory CRUD, graph traversal,
 * extraction, and agent sessions all run locally.
 *
 * The client is project-scoped:
 *   /v1/projects/:projectId/sync/{push,push/complete,pull,status}
 *
 * See `docs/architecture/cloud-sync-and-refactor.md` §7 for the contract.
 *
 * @public
 */
export function createTekMemoCloudClient(
	options: TekMemoCloudClientOptions,
): TekMemoCloudClient {
	const transport = new TekMemoCloudTransport(options);
	const defaultProjectId = options.defaultProjectId;

	const projectPath = (
		projectIdInput: string | undefined,
		suffix: string,
	): string => {
		const projectId = encodeURIComponent(
			assertProjectId(projectIdInput, defaultProjectId),
		);
		return `/projects/${projectId}${suffix}`;
	};

	const resolveProjectId = (
		input: ProjectScopedInput | undefined,
	): string | undefined => {
		const fromInput =
			input && typeof input.projectId === "string" && input.projectId.trim()
				? input.projectId
				: undefined;
		return fromInput ?? defaultProjectId;
	};

	return {
		health(signal) {
			return transport.request<TekMemoCloudHealthResult>({
				method: "GET",
				path: "/health",
				signal,
				requireApiKey: false,
			});
		},
		readiness(signal) {
			return transport.request<TekMemoCloudHealthResult>({
				method: "GET",
				path: "/readiness",
				signal,
				requireApiKey: false,
			});
		},
		sync: {
			/**
			 * Phase 1 of a two-phase push. Sends the local file manifest; the server
			 * diffs it against its own manifest and returns presigned upload URLs for
			 * every file it needs (missing or changed).
			 *
			 * Validation runs inside the async body so every error — bad input,
			 * missing API key, or a failed request — surfaces as a rejected promise,
			 * giving the client a single uniform error model.
			 */
			async push(input: SyncPushInput, signal?: AbortSignal) {
				const normalized = validateSyncPushInput(input);
				return transport.request<SyncPushResult>({
					method: "POST",
					path: projectPath(resolveProjectId(normalized), "/sync/push"),
					body: {
						manifest: normalized.manifest,
						baseCursor: normalized.baseCursor,
					},
					signal,
				});
			},
			/**
			 * Phase 2 of a two-phase push. Confirms which files the client uploaded;
			 * the server verifies each object's sha256 and commits the manifest update.
			 */
			async complete(
				input: SyncPushCompleteInput,
				signal?: AbortSignal,
			): Promise<SyncPushCompleteResult> {
				const normalized = validateSyncPushCompleteInput(input);
				return transport.request<SyncPushCompleteResult>({
					method: "POST",
					path: projectPath(
						resolveProjectId(normalized),
						"/sync/push/complete",
					),
					body: {
						uploaded: normalized.uploaded,
						cursor: normalized.cursor,
					},
					signal,
				});
			},
			/**
			 * Pull. Sends the local manifest (or a cursor); the server diffs and
			 * returns presigned download URLs for files the client is behind on, plus
			 * paths removed server-side.
			 */
			async pull(input: SyncPullInput = {}, signal?: AbortSignal) {
				const normalized = validateSyncPullInput(input);
				return transport.request<SyncPullResult>({
					method: "POST",
					path: projectPath(resolveProjectId(normalized), "/sync/pull"),
					body: {
						manifest: normalized.manifest,
						since: normalized.since,
					},
					signal,
				});
			},
			/** Reads the cloud manifest, cursor, and storage usage. */
			async status(input: SyncStatusInput = {}, signal?: AbortSignal) {
				const normalized = validateSyncStatusInput(input);
				return transport.request<SyncStatusResult>({
					method: "GET",
					path: projectPath(resolveProjectId(normalized), "/sync/status"),
					query: compactQuery({}),
					signal,
				});
			},
		},
	};
}

export function createTekMemoCloudClientFromEnv(
	env: Record<string, string | undefined> = defaultEnv(),
	options: Partial<Omit<TekMemoCloudClientOptions, "baseUrl" | "apiKey">> = {},
): TekMemoCloudClient {
	const baseUrl = env.TEKMEMO_CLOUD_URL ?? env.TEKMEMO_API_URL;
	if (!baseUrl) {
		throw new Error("TEKMEMO_CLOUD_URL or TEKMEMO_API_URL is required.");
	}
	return createTekMemoCloudClient({
		...options,
		baseUrl,
		apiKey: env.TEKMEMO_API_KEY,
		defaultProjectId: options.defaultProjectId ?? env.TEKMEMO_PROJECT_ID,
		defaultWorkspaceId: options.defaultWorkspaceId ?? env.TEKMEMO_WORKSPACE_ID,
	});
}

function defaultEnv(): Record<string, string | undefined> {
	if (process?.env) return process.env;
	return {};
}

/**
 * Binds a cloud client to a single project. Every sync call is automatically
 * scoped to `projectId`, so callers can pass inputs without repeating it.
 */
export function createProjectScopedClient(
	client: TekMemoCloudClient,
	projectId: string,
): TekMemoCloudClient {
	assertProjectId(projectId);
	const withProject = <T extends ProjectScopedInput>(
		input?: T,
	): T & { projectId: string } => ({
		...(input ?? ({} as T)),
		projectId,
	});

	return {
		health: client.health.bind(client),
		readiness: client.readiness.bind(client),
		sync: {
			push(input, signal) {
				return client.sync.push(withProject(input), signal);
			},
			complete(input, signal) {
				return client.sync.complete(withProject(input), signal);
			},
			pull(input, signal) {
				return client.sync.pull(withProject(input), signal);
			},
			status(input, signal) {
				return client.sync.status(withProject(input), signal);
			},
		},
	};
}
