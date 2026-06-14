import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	createTekMemoCloudClient,
	type TekMemoCloudClientOptions,
} from "@tekbreed/tekmemo";
import type { TekMemoMcpRuntime, TekMemoRuntimeMode } from "../types";
import type { TekMemoCloudClientLike } from "./cloud";
import { createCloudTekMemoMcpRuntime } from "./cloud";
import { createHybridTekMemoMcpRuntime } from "./hybrid";
import { createInMemoryTekMemoRuntime } from "./in-memory";
import { createLocalTekMemoMcpRuntime } from "./local";

export interface RuntimeFactoryOptions {
	mode?: TekMemoRuntimeMode;
	rootDir?: string;
	projectId?: string;
	workspaceId?: string;
	cloudClient?: TekMemoCloudClientLike;
	cloud?: CloudRuntimeFactoryOptions;
	readPolicy?: RuntimeReadPolicy;
	writePolicy?: RuntimeWritePolicy;
}

export interface CloudRuntimeFactoryOptions {
	baseUrl?: string | undefined;
	apiKey?: string | undefined;
	workspaceId?: string | undefined;
	projectId?: string | undefined;
	timeoutMs?: number | undefined;
	userAgent?: string | undefined;
	requireApiKey?: boolean | undefined;
	acceptLegacyEnvelope?: boolean | undefined;
	retry?: TekMemoCloudClientOptions["retry"] | undefined;
}

export type RuntimeReadPolicy =
	| "local-first"
	| "cloud-first"
	| "local-only"
	| "cloud-only";
export type RuntimeWritePolicy =
	| "local-first"
	| "cloud-first"
	| "local-only"
	| "cloud-only";

export function createTekMemoMcpRuntimeFromConfig(
	options: RuntimeFactoryOptions = {},
): TekMemoMcpRuntime {
	const rootDir = options.rootDir ?? process.env.TEKMEMO_ROOT ?? process.cwd();
	const fileConfig = readLocalConfig(rootDir);
	const mode = options.mode ?? envRuntimeMode() ?? fileConfig.mode ?? "local";
	const projectId =
		options.projectId ?? process.env.TEKMEMO_PROJECT_ID ?? fileConfig.projectId;
	const workspaceId =
		options.workspaceId ??
		process.env.TEKMEMO_WORKSPACE_ID ??
		fileConfig.workspaceId;

	if (mode === "memory") return createInMemoryTekMemoRuntime();

	if (mode === "local") {
		return createLocalTekMemoMcpRuntime({
			rootDir,
			...(projectId === undefined ? {} : { projectId }),
		});
	}

	if (mode === "cloud") {
		return createCloudTekMemoMcpRuntime({
			client:
				options.cloudClient ??
				createCloudClientFromRuntimeOptions(
					mergeCloudOptions(options.cloud, fileConfig.cloud, {
						workspaceId,
						projectId,
					}),
				),
			...(projectId === undefined ? {} : { projectId }),
		});
	}

	if (mode === "hybrid") {
		const local = createLocalTekMemoMcpRuntime({
			rootDir,
			...(projectId === undefined ? {} : { projectId }),
		});
		const cloud = createCloudTekMemoMcpRuntime({
			client:
				options.cloudClient ??
				createCloudClientFromRuntimeOptions(
					mergeCloudOptions(options.cloud, fileConfig.cloud, {
						workspaceId,
						projectId,
					}),
				),
			...(projectId === undefined ? {} : { projectId }),
		});
		return createHybridTekMemoMcpRuntime({
			local,
			cloud,
			readPolicy:
				options.readPolicy ??
				envReadPolicy() ??
				fileConfig.readPolicy ??
				"local-first",
			writePolicy:
				options.writePolicy ??
				envWritePolicy() ??
				fileConfig.writePolicy ??
				"local-first",
		});
	}

	return createLocalTekMemoMcpRuntime({
		rootDir,
		...(projectId === undefined ? {} : { projectId }),
	});
}

export function createCloudClientFromRuntimeOptions(
	options: CloudRuntimeFactoryOptions = {},
): TekMemoCloudClientLike {
	const baseUrl =
		options.baseUrl ??
		process.env.TEKMEMO_CLOUD_URL ??
		process.env.TEKMEMO_API_URL;

	if (!baseUrl) {
		throw new Error(
			"Cloud runtime requires --cloud-url, TEKMEMO_CLOUD_URL, or TEKMEMO_API_URL.",
		);
	}

	const apiKey = options.apiKey ?? process.env.TEKMEMO_API_KEY;
	const timeoutMs =
		options.timeoutMs ?? envPositiveNumber("TEKMEMO_CLOUD_TIMEOUT_MS");
	const workspaceId = options.workspaceId ?? process.env.TEKMEMO_WORKSPACE_ID;
	const projectId = options.projectId ?? process.env.TEKMEMO_PROJECT_ID;

	return createTekMemoCloudClient({
		baseUrl,
		...(apiKey === undefined ? {} : { apiKey }),
		...(timeoutMs === undefined ? {} : { timeoutMs }),
		userAgent: options.userAgent ?? "@tekbreed/tekmemo/mcp/0.1.0",
		...(workspaceId === undefined ? {} : { defaultWorkspaceId: workspaceId }),
		...(projectId === undefined ? {} : { defaultProjectId: projectId }),
		...(options.requireApiKey === undefined
			? {}
			: { requireApiKey: options.requireApiKey }),
		...(options.acceptLegacyEnvelope === undefined
			? {}
			: { acceptLegacyEnvelope: options.acceptLegacyEnvelope }),
		...(options.retry === undefined ? {} : { retry: options.retry }),
	});
}

function mergeCloudOptions(
	first: CloudRuntimeFactoryOptions | undefined,
	second: CloudRuntimeFactoryOptions | undefined,
	scope: { workspaceId?: string | undefined; projectId?: string | undefined },
): CloudRuntimeFactoryOptions {
	return {
		...(second ?? {}),
		...(first ?? {}),
		...(scope.workspaceId === undefined
			? {}
			: { workspaceId: scope.workspaceId }),
		...(scope.projectId === undefined ? {} : { projectId: scope.projectId }),
	};
}

function envRuntimeMode(): TekMemoRuntimeMode | undefined {
	const value = process.env.TEKMEMO_RUNTIME;
	return isRuntimeMode(value) ? value : undefined;
}

function isRuntimeMode(value: unknown): value is TekMemoRuntimeMode {
	return (
		value === "local" ||
		value === "cloud" ||
		value === "hybrid" ||
		value === "memory"
	);
}

function envPositiveNumber(name: string): number | undefined {
	const value = process.env[name];
	if (value === undefined) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function envReadPolicy(): RuntimeReadPolicy | undefined {
	return isReadPolicy(process.env.TEKMEMO_READ_POLICY)
		? process.env.TEKMEMO_READ_POLICY
		: undefined;
}

function envWritePolicy(): RuntimeWritePolicy | undefined {
	return isWritePolicy(process.env.TEKMEMO_WRITE_POLICY)
		? process.env.TEKMEMO_WRITE_POLICY
		: undefined;
}

function isReadPolicy(value: unknown): value is RuntimeReadPolicy {
	return (
		value === "local-first" ||
		value === "cloud-first" ||
		value === "local-only" ||
		value === "cloud-only"
	);
}

function isWritePolicy(value: unknown): value is RuntimeWritePolicy {
	return isReadPolicy(value);
}

function readLocalConfig(rootDir: string): {
	mode?: TekMemoRuntimeMode;
	projectId?: string;
	workspaceId?: string;
	readPolicy?: RuntimeReadPolicy;
	writePolicy?: RuntimeWritePolicy;
	cloud?: CloudRuntimeFactoryOptions;
} {
	try {
		const path = resolve(rootDir, ".tekmemo", "config.json");
		const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<
			string,
			unknown
		>;
		const mcp = objectValue(parsed.mcp);
		const cloud = objectValue(parsed.cloud);
		const hybrid = objectValue(parsed.hybrid);
		const mode = isRuntimeMode(parsed.runtime)
			? parsed.runtime
			: isRuntimeMode(mcp.runtime)
				? mcp.runtime
				: undefined;
		const projectId =
			stringValue(parsed.projectId) ?? stringValue(cloud.projectId);
		const workspaceId = stringValue(cloud.workspaceId);
		const readPolicy = isReadPolicy(hybrid.readPolicy)
			? hybrid.readPolicy
			: isReadPolicy(mcp.readPolicy)
				? mcp.readPolicy
				: undefined;
		const writePolicy = isWritePolicy(hybrid.writePolicy)
			? hybrid.writePolicy
			: isWritePolicy(mcp.writePolicy)
				? mcp.writePolicy
				: undefined;
		return {
			...(mode === undefined ? {} : { mode }),
			...(projectId === undefined ? {} : { projectId }),
			...(workspaceId === undefined ? {} : { workspaceId }),
			...(readPolicy === undefined ? {} : { readPolicy }),
			...(writePolicy === undefined ? {} : { writePolicy }),
			cloud: {
				...(stringValue(cloud.baseUrl) === undefined
					? {}
					: { baseUrl: stringValue(cloud.baseUrl) }),
				...(workspaceId === undefined ? {} : { workspaceId }),
				...(projectId === undefined ? {} : { projectId }),
			},
		};
	} catch {
		return {};
	}
}

function objectValue(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;
}
