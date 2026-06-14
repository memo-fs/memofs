import {
	createTekMemoCloudClient,
	redactSecrets,
	type TekMemoCloudClient,
	type TekMemoCloudClientOptions,
	TekMemoCloudError,
} from "@tekbreed/tekmemo";
import { CliUsageError } from "../errors/cli-errors";

export interface CloudConnectionOptions {
	cloudUrl?: string | undefined;
	apiKey?: string | undefined;
	workspaceId?: string | undefined;
	projectId?: string | undefined;
	timeoutMs?: number | string | undefined;
	allowMissingApiKey?: boolean | undefined;
	allowMissingProjectId?: boolean | undefined;
}

export interface NormalizedCloudConnectionOptions {
	baseUrl: string;
	apiKey?: string | undefined;
	workspaceId?: string | undefined;
	projectId?: string | undefined;
	timeoutMs?: number | undefined;
}

export function createCliCloudClient(
	options: CloudConnectionOptions = {},
): TekMemoCloudClient {
	return createTekMemoCloudClient(toCloudClientOptions(options));
}

export function toCloudClientOptions(
	options: CloudConnectionOptions = {},
): TekMemoCloudClientOptions {
	const normalized = normalizeCloudConnectionOptions(options);
	return {
		baseUrl: normalized.baseUrl,
		...(normalized.apiKey !== undefined ? { apiKey: normalized.apiKey } : {}),
		...(normalized.projectId !== undefined
			? { defaultProjectId: normalized.projectId }
			: {}),
		...(normalized.workspaceId !== undefined
			? { defaultWorkspaceId: normalized.workspaceId }
			: {}),
		...(normalized.timeoutMs !== undefined
			? { timeoutMs: normalized.timeoutMs }
			: {}),
		userAgent: "@tekbreed/tekmemo/cli",
		requireApiKey: !options.allowMissingApiKey,
		acceptLegacyEnvelope: false,
	};
}

export function normalizeCloudConnectionOptions(
	options: CloudConnectionOptions = {},
): NormalizedCloudConnectionOptions {
	const baseUrl = firstNonEmpty(
		options.cloudUrl,
		process.env.TEKMEMO_CLOUD_URL,
		process.env.TEKMEMO_API_URL,
	);
	if (!baseUrl) {
		throw new CliUsageError(
			"TekMemo Cloud URL is required. Pass --cloud-url or set TEKMEMO_CLOUD_URL.",
		);
	}

	const apiKey = firstNonEmpty(options.apiKey, process.env.TEKMEMO_API_KEY);
	if (!apiKey && !options.allowMissingApiKey) {
		throw new CliUsageError(
			"TekMemo Cloud API key is required. Pass --api-key or set TEKMEMO_API_KEY.",
		);
	}

	const workspaceId = firstNonEmpty(
		options.workspaceId,
		process.env.TEKMEMO_WORKSPACE_ID,
	);
	const projectId = firstNonEmpty(
		options.projectId,
		process.env.TEKMEMO_PROJECT_ID,
	);
	if (!projectId && !options.allowMissingProjectId) {
		throw new CliUsageError(
			"TekMemo Cloud project ID is required. Pass --project-id or set TEKMEMO_PROJECT_ID.",
		);
	}
	const timeoutMs = normalizeTimeoutMs(options.timeoutMs);

	return {
		baseUrl,
		...(apiKey !== undefined ? { apiKey } : {}),
		...(workspaceId !== undefined ? { workspaceId } : {}),
		...(projectId !== undefined ? { projectId } : {}),
		...(timeoutMs !== undefined ? { timeoutMs } : {}),
	};
}

export function formatCloudError(error: unknown): string {
	if (error instanceof TekMemoCloudError) {
		const parts = [error.message];
		if (error.status !== undefined) parts.push(`status=${error.status}`);
		if (error.code) parts.push(`code=${error.code}`);
		if (error.requestId) parts.push(`requestId=${error.requestId}`);
		if (error.retryAfterMs !== undefined)
			parts.push(`retryAfterMs=${error.retryAfterMs}`);
		return parts.join(" ");
	}
	return error instanceof Error ? error.message : String(error);
}

export function cloudConnectionSummary(
	options: NormalizedCloudConnectionOptions,
): Record<string, unknown> {
	return {
		baseUrl: options.baseUrl,
		apiKey: options.apiKey
			? redactSecrets(options.apiKey, [options.apiKey])
			: null,
		workspaceId: options.workspaceId ?? null,
		projectId: options.projectId ?? null,
		timeoutMs: options.timeoutMs ?? null,
	};
}

function firstNonEmpty(
	...values: Array<string | undefined>
): string | undefined {
	for (const value of values) {
		const trimmed = value?.trim();
		if (trimmed) return trimmed;
	}
	return undefined;
}

function normalizeTimeoutMs(
	value: number | string | undefined,
): number | undefined {
	if (value === undefined) return undefined;
	if (typeof value === "number") {
		if (!Number.isInteger(value) || value < 1) {
			throw new CliUsageError(
				"timeout must be a positive integer in milliseconds.",
			);
		}
		return value;
	}
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 1) {
		throw new CliUsageError(
			"timeout must be a positive integer in milliseconds.",
		);
	}
	return parsed;
}
