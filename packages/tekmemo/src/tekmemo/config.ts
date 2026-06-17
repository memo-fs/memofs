/**
 * Configuration options and resolution logic for the Tekmemo client.
 *
 * This module absorbs config resolution from the CLI (`resolveCliRuntimeConfig`)
 * and MCP server factory (`createTekMemoMcpRuntimeFromConfig`) into a single
 * source of truth inside the core package.
 *
 * Resolution priority: constructor args > env vars > `.tekmemo/config.json` > defaults.
 *
 * @public
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TekMemoCloudClientOptions } from "../cloud-client/types";
import type { MemoryEmbedder } from "../core/types/embeddings";
import type { MemoryStore } from "../core/types/memory-store";
import type { RecallStore } from "../recall/types";
import type {
	JsonObject,
	RuntimeReadPolicy,
	RuntimeWritePolicy,
	TekMemoRuntimeMode,
} from "./types";

export interface TekmemoCloudOptions {
	baseUrl?: string;
	apiKey?: string;
	workspaceId?: string;
	projectId?: string;
	timeoutMs?: number;
	userAgent?: string;
	requireApiKey?: boolean;
	retry?: TekMemoCloudClientOptions["retry"];
}

export interface TekmemoConfig {
	rootDir?: string;
	store?: MemoryStore;
	embedder?: MemoryEmbedder;
	recallStore?: RecallStore;
	projectId?: string;
	tenantId?: string;
	workspaceId?: string;
	mode?: TekMemoRuntimeMode;
	readPolicy?: RuntimeReadPolicy;
	writePolicy?: RuntimeWritePolicy;
	cloud?: TekmemoCloudOptions;
	cloudClient?: import("../cloud-client/types").TekMemoCloudClient;
	autoBootstrap?: boolean;
	name?: string;
	version?: string;
}

export interface ResolvedTekmemoConfig {
	rootDir: string;
	store?: MemoryStore;
	embedder?: MemoryEmbedder;
	recallStore?: RecallStore;
	projectId: string;
	tenantId?: string;
	workspaceId?: string;
	mode: TekMemoRuntimeMode;
	readPolicy: RuntimeReadPolicy;
	writePolicy: RuntimeWritePolicy;
	cloud?: TekMemoCloudClientOptions;
	cloudClient?: import("../cloud-client/types").TekMemoCloudClient;
	autoBootstrap: boolean;
	name: string;
	version: string;
}

interface TekMemoConfigFile {
	runtime?: TekMemoRuntimeMode;
	root?: string;
	projectId?: string;
	workspaceId?: string;
	readPolicy?: RuntimeReadPolicy;
	writePolicy?: RuntimeWritePolicy;
	cloud?: {
		baseUrl?: string;
		apiKey?: string;
		workspaceId?: string;
		projectId?: string;
		timeoutMs?: number;
	};
	hybrid?: {
		readPolicy?: RuntimeReadPolicy;
		writePolicy?: RuntimeWritePolicy;
	};
}

/**
 * Resolves Tekmemo configuration by merging constructor args, environment variables,
 * and `.tekmemo/config.json` with a strict priority chain.
 *
 * @param input - Constructor config, optional CWD, and env override (defaults to process.env).
 * @returns Fully resolved configuration with all defaults applied.
 */
export function resolveTekmemoConfig(input: {
	config?: TekmemoConfig;
	cwd?: string;
	env?: NodeJS.ProcessEnv;
}): ResolvedTekmemoConfig {
	const config = input.config ?? {};
	const env = input.env ?? process.env;
	const cwd = input.cwd ?? process.cwd();

	const rootDir = resolve(cwd, config.rootDir ?? env.TEKMEMO_ROOT ?? ".");

	const fileConfig = readTekMemoConfigFile(rootDir);

	const mode = resolveMode(config.mode, env, fileConfig);
	const projectId =
		config.projectId ??
		env.TEKMEMO_PROJECT_ID ??
		fileConfig.projectId ??
		"default";
	const workspaceId =
		config.workspaceId ?? env.TEKMEMO_WORKSPACE_ID ?? fileConfig.workspaceId;
	const tenantId = config.tenantId;
	const readPolicy =
		config.readPolicy ??
		(isReadPolicy(env.TEKMEMO_READ_POLICY)
			? env.TEKMEMO_READ_POLICY
			: undefined) ??
		fileConfig.readPolicy ??
		fileConfig.hybrid?.readPolicy ??
		"local-first";
	const writePolicy =
		config.writePolicy ??
		(isWritePolicy(env.TEKMEMO_WRITE_POLICY)
			? env.TEKMEMO_WRITE_POLICY
			: undefined) ??
		fileConfig.writePolicy ??
		fileConfig.hybrid?.writePolicy ??
		"local-first";

	const cloud = resolveCloudOptions(config, env, fileConfig, {
		workspaceId,
		projectId,
	});

	return {
		rootDir,
		...(config.store !== undefined ? { store: config.store } : {}),
		...(config.embedder !== undefined ? { embedder: config.embedder } : {}),
		...(config.recallStore !== undefined
			? { recallStore: config.recallStore }
			: {}),
		projectId,
		...(tenantId !== undefined ? { tenantId } : {}),
		...(workspaceId !== undefined ? { workspaceId } : {}),
		mode,
		readPolicy,
		writePolicy,
		...(cloud !== undefined ? { cloud } : {}),
		...(config.cloudClient !== undefined
			? { cloudClient: config.cloudClient }
			: {}),
		autoBootstrap: config.autoBootstrap ?? true,
		name: config.name ?? "tekmemo",
		version: config.version ?? "0.1.0",
	};
}

function resolveMode(
	arg: TekMemoRuntimeMode | undefined,
	env: NodeJS.ProcessEnv,
	file: TekMemoConfigFile,
): TekMemoRuntimeMode {
	if (arg !== undefined) return arg;
	const envValue = env.TEKMEMO_RUNTIME;
	if (
		envValue === "local" ||
		envValue === "cloud" ||
		envValue === "hybrid" ||
		envValue === "memory"
	)
		return envValue;
	return file.runtime ?? "local";
}

function resolveCloudOptions(
	config: TekmemoConfig,
	env: NodeJS.ProcessEnv,
	file: TekMemoConfigFile,
	scope: { workspaceId?: string; projectId: string },
): TekMemoCloudClientOptions | undefined {
	const configCloud = config.cloud;
	const fileCloud = file.cloud;

	const baseUrl =
		configCloud?.baseUrl ??
		env.TEKMEMO_CLOUD_URL ??
		env.TEKMEMO_API_URL ??
		fileCloud?.baseUrl;

	if (baseUrl === undefined && config.cloudClient === undefined)
		return undefined;

	const apiKey = configCloud?.apiKey ?? env.TEKMEMO_API_KEY;
	const timeoutMs =
		configCloud?.timeoutMs ??
		(env.TEKMEMO_CLOUD_TIMEOUT_MS
			? Number(env.TEKMEMO_CLOUD_TIMEOUT_MS)
			: fileCloud?.timeoutMs);
	const workspaceId = configCloud?.workspaceId ?? scope.workspaceId;
	const projectId = configCloud?.projectId ?? scope.projectId;

	return {
		baseUrl: baseUrl ?? "",
		...(apiKey !== undefined ? { apiKey } : {}),
		...(timeoutMs !== undefined && Number.isFinite(timeoutMs) && timeoutMs > 0
			? { timeoutMs }
			: {}),
		...(workspaceId !== undefined ? { defaultWorkspaceId: workspaceId } : {}),
		...(projectId !== undefined ? { defaultProjectId: projectId } : {}),
		...(configCloud?.userAgent !== undefined
			? { userAgent: configCloud.userAgent }
			: {}),
		...(configCloud?.requireApiKey !== undefined
			? { requireApiKey: configCloud.requireApiKey }
			: {}),
		...(configCloud?.retry !== undefined ? { retry: configCloud.retry } : {}),
	};
}

function readTekMemoConfigFile(rootDir: string): TekMemoConfigFile {
	try {
		const path = resolve(rootDir, ".tekmemo", "config.json");
		const raw = readFileSync(path, "utf8");
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		return extractConfigFile(parsed);
	} catch {
		return {};
	}
}

function extractConfigFile(parsed: Record<string, unknown>): TekMemoConfigFile {
	const cloud = objectValue(parsed.cloud);
	const hybrid = objectValue(parsed.hybrid);
	const mcp = objectValue(parsed.mcp);
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

	const result: TekMemoConfigFile = {};
	if (mode !== undefined) result.runtime = mode;
	if (projectId !== undefined) result.projectId = projectId;
	if (workspaceId !== undefined) result.workspaceId = workspaceId;
	if (readPolicy !== undefined) result.readPolicy = readPolicy;
	if (writePolicy !== undefined) result.writePolicy = writePolicy;

	result.cloud = {};
	const baseUrl = stringValue(cloud.baseUrl);
	if (baseUrl !== undefined) result.cloud.baseUrl = baseUrl;
	const apiKey = stringValue(cloud.apiKey);
	if (apiKey !== undefined) result.cloud.apiKey = apiKey;
	if (workspaceId !== undefined) result.cloud.workspaceId = workspaceId;
	if (projectId !== undefined) result.cloud.projectId = projectId;
	if (typeof cloud.timeoutMs === "number" && cloud.timeoutMs > 0)
		result.cloud.timeoutMs = cloud.timeoutMs;

	result.hybrid = {};
	if (readPolicy !== undefined) result.hybrid.readPolicy = readPolicy;
	if (writePolicy !== undefined) result.hybrid.writePolicy = writePolicy;

	return result;
}

function isRuntimeMode(value: unknown): value is TekMemoRuntimeMode {
	return (
		value === "local" ||
		value === "cloud" ||
		value === "hybrid" ||
		value === "memory"
	);
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
