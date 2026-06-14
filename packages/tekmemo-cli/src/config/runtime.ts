import fs from "node:fs/promises";
import path from "node:path";
import { CliUsageError } from "../errors/cli-errors";

export type TekMemoRuntimeMode = "local" | "cloud" | "hybrid";
export type TekMemoReadPolicy =
	| "local-first"
	| "cloud-first"
	| "local-only"
	| "cloud-only";
export type TekMemoWritePolicy =
	| "local-first"
	| "cloud-first"
	| "local-only"
	| "cloud-only";

export interface TekMemoConfigFile {
	version?: number;
	runtime?: TekMemoRuntimeMode;
	root?: string;
	cloud?: {
		baseUrl?: string;
		workspaceId?: string;
		projectId?: string;
		timeoutMs?: number;
	};
	hybrid?: {
		readPolicy?: TekMemoReadPolicy;
		writePolicy?: TekMemoWritePolicy;
	};
}

export interface CliRuntimeFlags {
	root?: string;
	runtime?: string;
	cloudUrl?: string;
	apiKey?: string;
	workspaceId?: string;
	projectId?: string;
	timeoutMs?: string | number;
	readPolicy?: string;
	writePolicy?: string;
}

export interface ResolvedCliRuntimeConfig {
	runtime: TekMemoRuntimeMode;
	root: string;
	configPath: string;
	configLoaded: boolean;
	cloud: {
		cloudUrl?: string;
		apiKey?: string;
		workspaceId?: string;
		projectId?: string;
		timeoutMs?: number;
	};
	hybrid: {
		readPolicy: TekMemoReadPolicy;
		writePolicy: TekMemoWritePolicy;
	};
}

export async function resolveCliRuntimeConfig(input: {
	cwd: string;
	flags?: CliRuntimeFlags;
	env?: NodeJS.ProcessEnv;
}): Promise<ResolvedCliRuntimeConfig> {
	const flags = input.flags ?? {};
	const env = input.env ?? process.env;
	const initialRoot =
		firstNonEmpty(flags.root, env.TEKMEMO_ROOT, input.cwd) ?? input.cwd;
	const configPath = path.join(
		path.resolve(input.cwd, initialRoot),
		".tekmemo",
		"config.json",
	);
	const config = await readOptionalConfig(configPath);
	const configRoot = config.value?.root;
	const root = path.resolve(
		input.cwd,
		firstNonEmpty(flags.root, env.TEKMEMO_ROOT, configRoot, initialRoot) ??
			initialRoot,
	);
	const runtime = normalizeRuntime(
		firstNonEmpty(
			flags.runtime,
			env.TEKMEMO_RUNTIME,
			config.value?.runtime,
			"local",
		),
	);
	const readPolicy = normalizeReadPolicy(
		firstNonEmpty(
			flags.readPolicy,
			env.TEKMEMO_READ_POLICY,
			config.value?.hybrid?.readPolicy,
			"local-first",
		),
	);
	const writePolicy = normalizeWritePolicy(
		firstNonEmpty(
			flags.writePolicy,
			env.TEKMEMO_WRITE_POLICY,
			config.value?.hybrid?.writePolicy,
			"local-first",
		),
	);
	const timeoutValue = firstDefined(
		flags.timeoutMs,
		env.TEKMEMO_CLOUD_TIMEOUT_MS,
		config.value?.cloud?.timeoutMs,
	);
	const timeoutMs = normalizeTimeoutMs(timeoutValue);
	return {
		runtime,
		root,
		configPath,
		configLoaded: config.loaded,
		cloud: compactCloud({
			cloudUrl: firstNonEmpty(
				flags.cloudUrl,
				env.TEKMEMO_CLOUD_URL,
				env.TEKMEMO_API_URL,
				config.value?.cloud?.baseUrl,
			),
			apiKey: firstNonEmpty(flags.apiKey, env.TEKMEMO_API_KEY),
			workspaceId: firstNonEmpty(
				flags.workspaceId,
				env.TEKMEMO_WORKSPACE_ID,
				config.value?.cloud?.workspaceId,
			),
			projectId: firstNonEmpty(
				flags.projectId,
				env.TEKMEMO_PROJECT_ID,
				config.value?.cloud?.projectId,
			),
			...(timeoutMs !== undefined ? { timeoutMs } : {}),
		}),
		hybrid: { readPolicy, writePolicy },
	};
}

export async function writeDefaultCliConfig(input: {
	cwd: string;
	root?: string;
	config?: TekMemoConfigFile;
	force?: boolean;
}): Promise<{ path: string; created: boolean; overwritten: boolean }> {
	const root = path.resolve(input.cwd, input.root ?? ".");
	const configPath = path.join(root, ".tekmemo", "config.json");
	await fs.mkdir(path.dirname(configPath), { recursive: true });
	const exists = await fileExists(configPath);
	if (exists && !input.force)
		return { path: configPath, created: false, overwritten: false };
	const config = input.config ?? {
		version: 1,
		runtime: "local",
		root: ".",
	};
	await fs.writeFile(
		configPath,
		`${JSON.stringify(config, null, 2)}\n`,
		"utf8",
	);
	return { path: configPath, created: !exists, overwritten: exists };
}

async function readOptionalConfig(
	configPath: string,
): Promise<{ loaded: boolean; value?: TekMemoConfigFile }> {
	try {
		const raw = await fs.readFile(configPath, "utf8");
		const parsed = JSON.parse(raw) as unknown;
		return { loaded: true, value: validateConfig(parsed, configPath) };
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") return { loaded: false };
		if (error instanceof SyntaxError) {
			throw new CliUsageError(
				`Invalid TekMemo config JSON at ${configPath}: ${error.message}`,
			);
		}
		throw error;
	}
}

function validateConfig(value: unknown, configPath: string): TekMemoConfigFile {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new CliUsageError(`TekMemo config must be an object: ${configPath}`);
	}
	const record = value as TekMemoConfigFile;
	if (record.runtime !== undefined) normalizeRuntime(record.runtime);
	if (record.hybrid?.readPolicy !== undefined)
		normalizeReadPolicy(record.hybrid.readPolicy);
	if (record.hybrid?.writePolicy !== undefined)
		normalizeWritePolicy(record.hybrid.writePolicy);
	if (record.cloud?.timeoutMs !== undefined)
		normalizeTimeoutMs(record.cloud.timeoutMs);
	return record;
}

function normalizeRuntime(value: unknown): TekMemoRuntimeMode {
	if (value === "local" || value === "cloud" || value === "hybrid")
		return value;
	throw new CliUsageError("runtime must be local, cloud, or hybrid.");
}

function normalizeReadPolicy(value: unknown): TekMemoReadPolicy {
	if (
		value === "local-first" ||
		value === "cloud-first" ||
		value === "local-only" ||
		value === "cloud-only"
	)
		return value;
	throw new CliUsageError(
		"read policy must be local-first, cloud-first, local-only, or cloud-only.",
	);
}

function normalizeWritePolicy(value: unknown): TekMemoWritePolicy {
	if (
		value === "local-first" ||
		value === "cloud-first" ||
		value === "local-only" ||
		value === "cloud-only"
	)
		return value;
	throw new CliUsageError(
		"write policy must be local-first, cloud-first, local-only, or cloud-only.",
	);
}

function normalizeTimeoutMs(value: unknown): number | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	const parsed = typeof value === "number" ? value : Number(value);
	if (!Number.isInteger(parsed) || parsed < 1) {
		throw new CliUsageError(
			"cloud timeout must be a positive integer in milliseconds.",
		);
	}
	return parsed;
}

function firstNonEmpty(...values: unknown[]): string | undefined {
	for (const value of values) {
		if (typeof value !== "string") continue;
		const trimmed = value.trim();
		if (trimmed) return trimmed;
	}
	return undefined;
}

function firstDefined(...values: unknown[]): unknown {
	for (const value of values) {
		if (value !== undefined) return value;
	}
	return undefined;
}

function compactCloud(input: {
	cloudUrl?: string;
	apiKey?: string;
	workspaceId?: string;
	projectId?: string;
	timeoutMs?: number;
}): ResolvedCliRuntimeConfig["cloud"] {
	return {
		...(input.cloudUrl !== undefined ? { cloudUrl: input.cloudUrl } : {}),
		...(input.apiKey !== undefined ? { apiKey: input.apiKey } : {}),
		...(input.workspaceId !== undefined
			? { workspaceId: input.workspaceId }
			: {}),
		...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
		...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}),
	};
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.stat(filePath);
		return true;
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") return false;
		throw error;
	}
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error;
}
