import type {
	GraphEdgeInput,
	GraphNodeInput,
	MemoryContextInput,
	RecallInput,
	TekMemoMcpRuntime,
	WriteMemoryInput,
} from "../types.js";
import { buildRuntimeContext } from "./helpers.js";

export type HybridReadPolicy =
	| "local-first"
	| "cloud-first"
	| "local-only"
	| "cloud-only";
export type HybridWritePolicy =
	| "local-first"
	| "cloud-first"
	| "local-only"
	| "cloud-only";

export interface HybridTekMemoMcpRuntimeOptions {
	local: TekMemoMcpRuntime;
	cloud: TekMemoMcpRuntime;
	writePolicy?: HybridWritePolicy;
	readPolicy?: HybridReadPolicy;
}

export function createHybridTekMemoMcpRuntime(
	options: HybridTekMemoMcpRuntimeOptions,
): TekMemoMcpRuntime {
	const writePolicy = options.writePolicy ?? "local-first";
	const readPolicy = options.readPolicy ?? "local-first";
	const primaryRead = () =>
		readPolicy === "cloud-first" || readPolicy === "cloud-only"
			? options.cloud
			: options.local;
	const secondaryRead = () =>
		readPolicy === "cloud-first" || readPolicy === "cloud-only"
			? options.local
			: options.cloud;

	return {
		async health(signal?: AbortSignal) {
			const [local, cloud] = await Promise.allSettled([
				options.local.health(signal),
				options.cloud.health(signal),
			]);
			const warnings: string[] = [];
			if (local.status === "rejected") {
				warnings.push(`local runtime unhealthy: ${formatError(local.reason)}`);
			} else if (!local.value.ok) {
				warnings.push("local runtime reported ok=false");
			}
			if (cloud.status === "rejected") {
				warnings.push(`cloud runtime unhealthy: ${formatError(cloud.reason)}`);
			} else if (!cloud.value.ok) {
				warnings.push("cloud runtime reported ok=false");
			}
			return {
				ok: warnings.length === 0,
				name: "hybrid-tekmemo-runtime",
				version: "0.1.0",
				mode: "hybrid",
				capabilities: [
					"context",
					"recall",
					"remember",
					"readCoreMemory",
					"readNotesMemory",
					"listRecentMemories",
					"updateCoreMemory",
					"sync",
					"local",
					"cloud",
					"hybrid",
				],
				...(warnings.length === 0 ? {} : { warnings }),
			};
		},

		async context(input: MemoryContextInput, signal?: AbortSignal) {
			return buildRuntimeContext(this, input, signal);
		},

		async recall(input: RecallInput, signal?: AbortSignal) {
			if (readPolicy === "local-only")
				return options.local.recall(input, signal);
			if (readPolicy === "cloud-only")
				return options.cloud.recall(input, signal);
			const warnings: string[] = [];
			const [first, second] = await Promise.allSettled([
				primaryRead().recall(input, signal),
				secondaryRead().recall(input, signal),
			]);
			const items = [];
			if (first.status === "fulfilled") items.push(...first.value.items);
			else warnings.push(`primary recall failed: ${formatError(first.reason)}`);
			if (second.status === "fulfilled") items.push(...second.value.items);
			else
				warnings.push(`secondary recall failed: ${formatError(second.reason)}`);
			const seen = new Set<string>();
			const deduped = items.filter((item) => {
				const key = `${item.id}:${item.text}`;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
			return {
				items: deduped.slice(0, input.limit ?? 10),
				...(warnings.length === 0 ? {} : { warnings }),
			};
		},

		async writeMemory(input: WriteMemoryInput, signal?: AbortSignal) {
			if (writePolicy === "local-only")
				return options.local.writeMemory(input, signal);
			if (writePolicy === "cloud-only")
				return options.cloud.writeMemory(input, signal);
			const first =
				writePolicy === "cloud-first" ? options.cloud : options.local;
			const second =
				writePolicy === "cloud-first" ? options.local : options.cloud;
			const result = await first.writeMemory(input, signal);
			try {
				await second.writeMemory(input, signal);
			} catch (error) {
				return {
					...result,
					warnings: [
						...(result.warnings ?? []),
						`secondary write failed: ${formatError(error)}`,
					],
				};
			}
			return result;
		},

		readCoreMemory(input, signal) {
			return readOptional(
				readPolicy,
				options.local,
				options.cloud,
				"readCoreMemory",
				[input],
				signal,
			);
		},
		readNotesMemory(input, signal) {
			return readOptional(
				readPolicy,
				options.local,
				options.cloud,
				"readNotesMemory",
				[input],
				signal,
			);
		},
		listRecentMemories(input, signal) {
			return readOptional(
				readPolicy,
				options.local,
				options.cloud,
				"listRecentMemories",
				[input],
				signal,
			);
		},
		validate(input, signal) {
			return readOptional(
				readPolicy,
				options.local,
				options.cloud,
				"validate",
				[input],
				signal,
			);
		},
		createSnapshot(input, signal) {
			return writeOptional(
				writePolicy,
				options.local,
				options.cloud,
				"createSnapshot",
				[input],
				signal,
			);
		},
		updateCoreMemory(input, signal) {
			return writeOptional(
				writePolicy,
				options.local,
				options.cloud,
				"updateCoreMemory",
				[input],
				signal,
			);
		},
		syncPush(input, signal) {
			return writeOptional(
				writePolicy,
				options.local,
				options.cloud,
				"syncPush",
				[input],
				signal,
			);
		},
		syncPull(input, signal) {
			return readOptional(
				readPolicy,
				options.local,
				options.cloud,
				"syncPull",
				[input],
				signal,
			);
		},
		syncStatus(input, signal) {
			return readOptional(
				readPolicy,
				options.local,
				options.cloud,
				"syncStatus",
				[input],
				signal,
			);
		},
		resolveSyncConflict(input, signal) {
			return writeOptional(
				writePolicy,
				options.local,
				options.cloud,
				"resolveSyncConflict",
				[input],
				signal,
			);
		},

		upsertGraphNodes(
			input: {
				workspaceId?: string;
				projectId?: string;
				nodes: GraphNodeInput[];
			},
			signal?: AbortSignal,
		) {
			return writeOptional(
				writePolicy,
				options.local,
				options.cloud,
				"upsertGraphNodes",
				[input],
				signal,
			);
		},
		upsertGraphEdges(
			input: {
				workspaceId?: string;
				projectId?: string;
				edges: GraphEdgeInput[];
			},
			signal?: AbortSignal,
		) {
			return writeOptional(
				writePolicy,
				options.local,
				options.cloud,
				"upsertGraphEdges",
				[input],
				signal,
			);
		},
		graphNeighbors(input, signal) {
			return readOptional(
				readPolicy,
				options.local,
				options.cloud,
				"graphNeighbors",
				[input],
				signal,
			);
		},
		graphPath(input, signal) {
			return readOptional(
				readPolicy,
				options.local,
				options.cloud,
				"graphPath",
				[input],
				signal,
			);
		},
		listGraphNodes(input, signal) {
			return readOptional(
				readPolicy,
				options.local,
				options.cloud,
				"listGraphNodes",
				[input],
				signal,
			);
		},
		listGraphEdges(input, signal) {
			return readOptional(
				readPolicy,
				options.local,
				options.cloud,
				"listGraphEdges",
				[input],
				signal,
			);
		},
	};
}

async function readOptional(
	policy: HybridReadPolicy,
	local: TekMemoMcpRuntime,
	cloud: TekMemoMcpRuntime,
	method: keyof TekMemoMcpRuntime,
	args: unknown[],
	signal: AbortSignal | undefined,
): Promise<any> {
	if (policy === "local-only") return call(local, method, args, signal);
	if (policy === "cloud-only") return call(cloud, method, args, signal);
	const first = policy === "cloud-first" ? cloud : local;
	const second = policy === "cloud-first" ? local : cloud;
	try {
		return await call(first, method, args, signal);
	} catch {
		return call(second, method, args, signal);
	}
}

async function writeOptional(
	policy: HybridWritePolicy,
	local: TekMemoMcpRuntime,
	cloud: TekMemoMcpRuntime,
	method: keyof TekMemoMcpRuntime,
	args: unknown[],
	signal: AbortSignal | undefined,
): Promise<any> {
	if (policy === "local-only") return call(local, method, args, signal);
	if (policy === "cloud-only") return call(cloud, method, args, signal);
	const primary = policy === "cloud-first" ? cloud : local;
	const secondary = policy === "cloud-first" ? local : cloud;
	const result = await call(primary, method, args, signal);
	try {
		await call(secondary, method, args, signal);
	} catch {
		// Deliberately do not fail hybrid write if secondary write fails.
	}
	return result;
}

async function call(
	runtime: TekMemoMcpRuntime,
	method: keyof TekMemoMcpRuntime,
	args: unknown[],
	signal: AbortSignal | undefined,
): Promise<any> {
	const fn = runtime[method];
	if (typeof fn !== "function") {
		throw new Error(`Runtime method ${String(method)} is not available.`);
	}
	return (fn as (...methodArgs: unknown[]) => Promise<any>)(...args, signal);
}

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
