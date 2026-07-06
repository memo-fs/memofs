/**
 * Configuration options and resolution logic for the MemoFS client.
 *
 * This module absorbs config resolution from the CLI (`resolveCliRuntimeConfig`)
 * and MCP server factory (`createMemoFSMcpRuntimeFromConfig`) into a single
 * source of truth inside the core package.
 *
 * Resolution priority: constructor args > env vars > `.memofs/config.json` > defaults.
 *
 * @public
 */

import type { LlmClient } from "../ai-runtime/llm-client";
import type { MemoFsCloudClientOptions } from "../cloud-client/types";
import type { MemoryEmbedder } from "../core/types/embeddings";
import type { MemoryStore } from "../core/types/memory-store";
import type { Extractor } from "../graph/extraction/extractor";
import type { RecallStore } from "../recall/types";
import type { Reranker } from "../rerank/types";
import type {
	MemoFSRuntimeMode,
	RuntimeReadPolicy,
	RuntimeWritePolicy,
} from "./types";

export interface MemoFsCloudOptions {
	baseUrl?: string;
	apiKey?: string;
	workspaceId?: string;
	projectId?: string;
	timeoutMs?: number;
	userAgent?: string;
	requireApiKey?: boolean;
	retry?: MemoFsCloudClientOptions["retry"];
}

export interface MemoFsConfig {
	rootDir?: string;
	store?: MemoryStore;
	/**
	 * Pre-parsed `.memofs/config.json` values. Core no longer reads the
	 * filesystem (the read moved to Node-only entry points so the root barrel
	 * stays free of `node:fs`). A Node consumer reads the file and
	 * passes it here; the Worker path injects a store and never sets this.
	 */
	fileConfig?: MemoFsConfigFile;
	embedder?: MemoryEmbedder;
	recallStore?: RecallStore;
	/**
	 * Optional graph extractor (LLM-based or otherwise). When omitted, the
	 * zero-config rule-based extractor runs ( fallback). When provided,
	 * extraction + consolidation can grow the graph from natural prose.
	 */
	extractor?: Extractor;
	/**
	 * Optional reranker for hybrid recall. When omitted, the zero-config
	 * lexical token-overlap reranker runs. Inject a provider reranker (e.g.
	 * Voyage) so hybrid recall reorders candidates by semantic relevance.
	 */
	reranker?: Reranker;
	/**
	 * Optional LLM transport (the 4th contract member) powering the
	 * LLM-enhanced intelligence tier — the retrieval strategist (Q23),
	 * writer-critic consolidation (Q25a), staleness re-verification (Q24 v1.x),
	 * and semantic consolidation (Q25a). When omitted, every feature runs its
	 * deterministic default (regex rewrite, the deterministic `consolidateGraph`,
	 * etc.) — the absence of an `LlmClient` *is* the deterministic default, not a
	 * parallel built-in impl. Inject a provider client (OpenAI today,
	 * Anthropic/local later) to upgrade those features.
	 */
	llmClient?: LlmClient;
	projectId?: string;
	tenantId?: string;
	workspaceId?: string;
	mode?: MemoFSRuntimeMode;
	readPolicy?: RuntimeReadPolicy;
	writePolicy?: RuntimeWritePolicy;
	cloud?: MemoFsCloudOptions;
	cloudClient?: import("../cloud-client/types").MemoFsCloudClient;
	autoBootstrap?: boolean;
	name?: string;
	version?: string;
	/**
	 * Recall engine configuration for local/hybrid modes. When omitted, local
	 * mode defaults to lexical-only recall (no embedder, zero config).
	 */
	recall?: RecallEngineConfig;
}

/**
 * Local recall engine configuration.
 *
 * @public
 */
export interface RecallEngineConfig {
	/**
	 * Retrieval strategy.
	 * - `"lexical"` — BM25 + fuzzy only, no embeddings, zero config (default).
	 * - `"vector"` — semantic embeddings only (requires an embedder).
	 * - `"hybrid"` — both paths merged and reranked (requires an embedder).
	 * - `"auto"` — `"hybrid"` when an embedder is available, else `"lexical"`.
	 * @defaultValue `"auto"`
	 */
	engine?: "lexical" | "vector" | "hybrid" | "auto";
	/**
	 * When true (default in the MCP runtime), a local ONNX embedder is
	 * lazy-loaded so hybrid recall works with zero API keys. Disable to keep
	 * the runtime import-light.
	 */
	localEmbeddings?: boolean;
	/**
	 * Optional local embedding model id (Transformers.js compatible).
	 * @defaultValue `"Xenova/all-MiniLM-L6-v2"`
	 */
	embeddingModel?: string;
}

export interface ResolvedMemoFsConfig {
	rootDir: string;
	store?: MemoryStore;
	embedder?: MemoryEmbedder;
	recallStore?: RecallStore;
	extractor?: Extractor;
	reranker?: Reranker;
	llmClient?: LlmClient;
	projectId: string;
	tenantId?: string;
	workspaceId?: string;
	mode: MemoFSRuntimeMode;
	readPolicy: RuntimeReadPolicy;
	writePolicy: RuntimeWritePolicy;
	cloud?: MemoFsCloudClientOptions;
	cloudClient?: import("../cloud-client/types").MemoFsCloudClient;
	autoBootstrap: boolean;
	name: string;
	version: string;
	recall: Required<RecallEngineConfig>;
}

export interface MemoFsConfigFile {
	runtime?: MemoFSRuntimeMode;
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
	recall?: {
		engine?: "lexical" | "vector" | "hybrid" | "auto";
		localEmbeddings?: boolean;
		embeddingModel?: string;
	};
}

/**
 * Resolves MemoFS configuration by merging constructor args, environment variables,
 * and `.memofs/config.json` with a strict priority chain.
 *
 * @param input - Constructor config, optional CWD, and env override (defaults to process.env).
 * @returns Fully resolved configuration with all defaults applied.
 */
export function resolveMemoFsConfig(input: {
	config?: MemoFsConfig;
	cwd?: string;
	env?: NodeJS.ProcessEnv;
}): ResolvedMemoFsConfig {
	const config = input.config ?? {};
	const env = input.env ?? process.env;
	const cwd = input.cwd ?? process.cwd();

	// `rootDir` is resolved against CWD WITHOUT `node:path` — a pure join keeps
	// `resolveMemoFsConfig` (and the root barrel) free of any `node:` import
	// edge so it loads in workerd. The Node-fs store re-normalizes
	// via `normalizeRootDir` (its own `node:path` call) on construction, so a
	// not-fully-absolute path here is corrected there. A Worker that injects its
	// own store ignores `rootDir` entirely.
	const rawRootDir = config.rootDir ?? env.MEMOFS_ROOT ?? ".";
	const rootDir =
		rawRootDir.startsWith("/") || rawRootDir.startsWith("file:")
			? rawRootDir
			: `${cwd.replace(/\/$/, "")}/${rawRootDir}`;

	// Config-file resolution is the caller's concern (Node-only) — see
	// {@link readMemoFsConfigFile}. Core never touches the filesystem.
	const fileConfig = config.fileConfig ?? readMemoFsConfigFile(rootDir);

	const mode = resolveMode(config.mode, env, fileConfig);
	const projectId =
		config.projectId ??
		env.MEMOFS_PROJECT_ID ??
		fileConfig.projectId ??
		"default";
	const workspaceId =
		config.workspaceId ?? env.MEMOFS_WORKSPACE_ID ?? fileConfig.workspaceId;
	const tenantId = config.tenantId;
	const readPolicy =
		config.readPolicy ??
		(isReadPolicy(env.MEMOFS_READ_POLICY)
			? env.MEMOFS_READ_POLICY
			: undefined) ??
		fileConfig.readPolicy ??
		fileConfig.hybrid?.readPolicy ??
		"local-first";
	const writePolicy =
		config.writePolicy ??
		(isWritePolicy(env.MEMOFS_WRITE_POLICY)
			? env.MEMOFS_WRITE_POLICY
			: undefined) ??
		fileConfig.writePolicy ??
		fileConfig.hybrid?.writePolicy ??
		"local-first";

	const cloud = resolveCloudOptions(config, env, fileConfig, {
		workspaceId,
		projectId,
	});

	const recall = resolveRecallEngine(config, env, fileConfig);

	return {
		rootDir,
		...(config.store !== undefined ? { store: config.store } : {}),
		...(config.embedder !== undefined ? { embedder: config.embedder } : {}),
		...(config.extractor !== undefined ? { extractor: config.extractor } : {}),
		...(config.reranker !== undefined ? { reranker: config.reranker } : {}),
		...(config.llmClient !== undefined ? { llmClient: config.llmClient } : {}),
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
		name: config.name ?? "memofs",
		version: config.version ?? "0.1.0",
		recall,
	};
}

/**
 * Resolve the recall engine config from constructor args > env > file > defaults.
 *
 * Priority: constructor `config.recall` > env vars > `.memofs/config.json` `recall`.
 *
 * - `MEMOFS_RECALL_ENGINE` → engine
 * - `MEMOFS_LOCAL_EMBEDDINGS` → localEmbeddings ("1"/"true" on, else off)
 * - `MEMOFS_EMBEDDING_MODEL` → embeddingModel
 */
function resolveRecallEngine(
	config: MemoFsConfig,
	env: NodeJS.ProcessEnv,
	file: MemoFsConfigFile,
): Required<RecallEngineConfig> {
	const cfg = config.recall ?? {};
	const fileRecall = file.recall ?? {};

	const engineRaw =
		cfg.engine ?? env.MEMOFS_RECALL_ENGINE ?? fileRecall.engine ?? "auto";
	const engine: RecallEngineConfig["engine"] = isRecallEngine(engineRaw)
		? engineRaw
		: "auto";

	const localEmbeddingsRaw =
		cfg.localEmbeddings ??
		(env.MEMOFS_LOCAL_EMBEDDINGS !== undefined
			? env.MEMOFS_LOCAL_EMBEDDINGS === "1" ||
				env.MEMOFS_LOCAL_EMBEDDINGS.toLowerCase() === "true"
			: undefined) ??
		fileRecall.localEmbeddings ??
		false;

	const embeddingModel =
		cfg.embeddingModel ??
		(typeof env.MEMOFS_EMBEDDING_MODEL === "string" &&
		env.MEMOFS_EMBEDDING_MODEL.length > 0
			? env.MEMOFS_EMBEDDING_MODEL
			: undefined) ??
		fileRecall.embeddingModel ??
		"Xenova/all-MiniLM-L6-v2";

	return { engine, localEmbeddings: localEmbeddingsRaw, embeddingModel };
}

function isRecallEngine(value: unknown): value is RecallEngineConfig["engine"] {
	return (
		value === "lexical" ||
		value === "vector" ||
		value === "hybrid" ||
		value === "auto"
	);
}

function resolveMode(
	arg: MemoFSRuntimeMode | undefined,
	env: NodeJS.ProcessEnv,
	file: MemoFsConfigFile,
): MemoFSRuntimeMode {
	if (arg !== undefined) return arg;
	const envValue = env.MEMOFS_RUNTIME;
	if (envValue === "local" || envValue === "hybrid" || envValue === "memory")
		return envValue;
	return file.runtime ?? "local";
}

function resolveCloudOptions(
	config: MemoFsConfig,
	env: NodeJS.ProcessEnv,
	file: MemoFsConfigFile,
	scope: { workspaceId?: string; projectId: string },
): MemoFsCloudClientOptions | undefined {
	const configCloud = config.cloud;
	const fileCloud = file.cloud;

	const baseUrl =
		configCloud?.baseUrl ??
		env.MEMOFS_CLOUD_URL ??
		env.MEMOFS_API_URL ??
		fileCloud?.baseUrl;

	if (baseUrl === undefined && config.cloudClient === undefined)
		return undefined;

	const apiKey = configCloud?.apiKey ?? env.MEMOFS_API_KEY;
	const timeoutMs =
		configCloud?.timeoutMs ??
		(env.MEMOFS_CLOUD_TIMEOUT_MS
			? Number(env.MEMOFS_CLOUD_TIMEOUT_MS)
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

/**
 * Reads `.memofs/config.json` if present (best-effort).
 *
 * @remarks
 * This used to read the file synchronously here via `node:fs`, but that eager
 * import pulled `node:fs` into the Worker bundle ( — the runtime
 * Worker cannot evaluate it). Config-file resolution is now the **caller's**
 * responsibility: a Node consumer (the CLI / MCP factory) reads the file and
 * passes its values as constructor args; the Worker path injects a store and
 * never reads the filesystem. This keeps `resolveMemoFsConfig` — and the
 * whole root barrel — free of any `node:fs` import edge.
 *
 * The hook is `config.fileConfig`: callers pre-parse the file and pass it
 * through, so the resolution priority chain (constructor > env > file >
 * defaults) is preserved without core touching the filesystem.
 */
function readMemoFsConfigFile(rootDir: string): MemoFsConfigFile {
	// No-op: the file read moved to Node-only entry points (CLI / MCP). The
	// `rootDir` is accepted for signature stability but never read here.
	void rootDir;
	return {};
}

export function extractConfigFile(
	parsed: Record<string, unknown>,
): MemoFsConfigFile {
	const cloud = objectValue(parsed.cloud);
	const hybrid = objectValue(parsed.hybrid);
	const mcp = objectValue(parsed.mcp);
	const recall = objectValue(parsed.recall);
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

	const result: MemoFsConfigFile = {};
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

	const recallEngineRaw = recall.engine;
	const recallEngine = isRecallEngine(recallEngineRaw)
		? recallEngineRaw
		: undefined;
	if (
		recallEngine !== undefined ||
		typeof recall.localEmbeddings === "boolean" ||
		typeof recall.embeddingModel === "string"
	) {
		result.recall = {};
		if (recallEngine !== undefined) result.recall.engine = recallEngine;
		if (typeof recall.localEmbeddings === "boolean")
			result.recall.localEmbeddings = recall.localEmbeddings;
		const embeddingModel = stringValue(recall.embeddingModel);
		if (embeddingModel !== undefined)
			result.recall.embeddingModel = embeddingModel;
	}

	return result;
}

function isRuntimeMode(value: unknown): value is MemoFSRuntimeMode {
	return value === "local" || value === "hybrid" || value === "memory";
}

function isReadPolicy(value: unknown): value is RuntimeReadPolicy {
	return (
		value === "local-first" || value === "cloud-first" || value === "local-only"
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
