/**
 * Hybrid runtime strategy for Tekmemo.
 *
 * Composes a local and cloud strategy, routing reads and writes based on
 * configurable read/write policies.
 *
 * @internal
 */

import { buildContext } from "./helpers";
import type {
	AgentSessionCompleteInput,
	AgentSessionExtractResult,
	AgentSessionFileInput,
	AgentSessionResult,
	AgentSessionStartInput,
	GraphEdgeInput,
	GraphNeighborsInput,
	GraphNodeInput,
	GraphPathInput,
	GraphPathResult,
	ListGraphInput,
	MemoryContextInput,
	MemoryContextResult,
	MemoryDocumentResult,
	RecallInput,
	RecallItem,
	RecallResult,
	RecentMemoryInput,
	RecentMemoryResult,
	RuntimeReadPolicy,
	RuntimeWritePolicy,
	SnapshotMemoryInput,
	SnapshotMemoryResult,
	SyncPullInput,
	SyncPullResult,
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
	TekMemoHealthResult,
	ValidateMemoryInput,
	ValidateMemoryResult,
	WriteMemoryInput,
	WriteMemoryResult,
} from "./types";

type AnyFn = (...args: unknown[]) => Promise<unknown>;

export interface HybridStrategyOptions {
	local: ReturnType<typeof import("./local-strategy").createLocalStrategy>;
	cloud: ReturnType<typeof import("./cloud-strategy").createCloudStrategy>;
	readPolicy: RuntimeReadPolicy;
	writePolicy: RuntimeWritePolicy;
}

export function createHybridStrategy(options: HybridStrategyOptions) {
	const { local, cloud, readPolicy, writePolicy } = options;

	const primaryRead = () =>
		readPolicy === "cloud-first" || readPolicy === "cloud-only" ? cloud : local;
	const secondaryRead = () =>
		readPolicy === "cloud-first" || readPolicy === "cloud-only" ? local : cloud;
	const primaryWrite = () =>
		writePolicy === "cloud-first" || writePolicy === "cloud-only"
			? cloud
			: local;
	const secondaryWrite = () =>
		writePolicy === "cloud-first" || writePolicy === "cloud-only"
			? local
			: cloud;

	return {
		async health(signal?: AbortSignal): Promise<TekMemoHealthResult> {
			const [localHealth, cloudHealth] = await Promise.allSettled([
				local.health(signal),
				cloud.health(signal),
			]);
			const warnings: string[] = [];
			if (localHealth.status === "rejected") {
				warnings.push(
					`local runtime unhealthy: ${formatError(localHealth.reason)}`,
				);
			} else if (!localHealth.value.ok) {
				warnings.push("local runtime reported ok=false");
			}
			if (cloudHealth.status === "rejected") {
				warnings.push(
					`cloud runtime unhealthy: ${formatError(cloudHealth.reason)}`,
				);
			} else if (!cloudHealth.value.ok) {
				warnings.push("cloud runtime reported ok=false");
			}
			return {
				ok: warnings.length === 0,
				name: "hybrid-tekmemo",
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

		async context(
			input: MemoryContextInput,
			signal?: AbortSignal,
		): Promise<MemoryContextResult> {
			return buildContext(
				{
					readCoreMemory: async (s) => readOptional("readCoreMemory", [], s),
					readNotesMemory: async (s) => readOptional("readNotesMemory", [], s),
					listRecentMemories: async (i, s) =>
						readOptional("listRecentMemories", [i], s),
					recall: (i, s) => hybridRecall(i, s),
				},
				input,
				signal,
			);
		},

		async recall(
			input: RecallInput,
			signal?: AbortSignal,
		): Promise<RecallResult> {
			return hybridRecall(input, signal);
		},

		async writeMemory(
			input: WriteMemoryInput,
			signal?: AbortSignal,
		): Promise<WriteMemoryResult> {
			if (writePolicy === "local-only") return local.writeMemory(input, signal);
			if (writePolicy === "cloud-only") return cloud.writeMemory(input, signal);
			const result = await primaryWrite().writeMemory(input, signal);
			try {
				await secondaryWrite().writeMemory(input, signal);
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

		async readCoreMemory(signal?: AbortSignal): Promise<MemoryDocumentResult> {
			return readOptional("readCoreMemory", [], signal);
		},

		async readNotesMemory(signal?: AbortSignal): Promise<MemoryDocumentResult> {
			return readOptional("readNotesMemory", [], signal);
		},

		async updateCoreMemory(
			content: string,
			signal?: AbortSignal,
		): Promise<MemoryDocumentResult> {
			if (writePolicy === "local-only")
				return local.updateCoreMemory(content, signal);
			if (writePolicy === "cloud-only")
				return cloud.updateCoreMemory(content, signal);
			const result = await primaryWrite().updateCoreMemory(content, signal);
			try {
				await secondaryWrite().updateCoreMemory(content, signal);
			} catch {
				// deliberately swallow secondary write failure
			}
			return result;
		},

		async listRecentMemories(
			input?: RecentMemoryInput,
			signal?: AbortSignal,
		): Promise<RecentMemoryResult> {
			return readOptional("listRecentMemories", [input], signal);
		},

		async validate(
			input?: ValidateMemoryInput,
			signal?: AbortSignal,
		): Promise<ValidateMemoryResult> {
			return readOptional("validate", [input], signal);
		},

		async createSnapshot(
			input?: SnapshotMemoryInput,
			signal?: AbortSignal,
		): Promise<SnapshotMemoryResult> {
			if (writePolicy === "local-only")
				return local.createSnapshot(input, signal);
			if (writePolicy === "cloud-only")
				return cloud.createSnapshot(input, signal);
			return primaryWrite().createSnapshot(input, signal);
		},

		async startAgentSession(
			input: AgentSessionStartInput,
			signal?: AbortSignal,
		): Promise<AgentSessionResult> {
			return primaryWrite().startAgentSession(input, signal);
		},

		async readAgentSessionFile(
			input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ content: string }> {
			return local.readAgentSessionFile(input, signal);
		},

		async writeAgentSessionFile(
			input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ written: true; path: string }> {
			return local.writeAgentSessionFile(input, signal);
		},

		async appendAgentSessionFile(
			input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ appended: true; path: string }> {
			return local.appendAgentSessionFile(input, signal);
		},

		async extractAgentSession(
			input: { sessionId: string; workspaceId?: string; projectId?: string },
			signal?: AbortSignal,
		): Promise<AgentSessionExtractResult> {
			return primaryRead().extractAgentSession(input, signal);
		},

		async completeAgentSession(
			input: AgentSessionCompleteInput,
			signal?: AbortSignal,
		): Promise<AgentSessionExtractResult & { durableMemoryWritten: boolean }> {
			return primaryWrite().completeAgentSession(input, signal);
		},

		async upsertGraphNodes(
			input: {
				workspaceId?: string;
				projectId?: string;
				nodes: GraphNodeInput[];
			},
			signal?: AbortSignal,
		): Promise<{ nodes: GraphNodeInput[] }> {
			if (writePolicy === "local-only")
				return local.upsertGraphNodes(input, signal);
			if (writePolicy === "cloud-only")
				return cloud.upsertGraphNodes(input, signal);
			const result = await primaryWrite().upsertGraphNodes(input, signal);
			try {
				await secondaryWrite().upsertGraphNodes(input, signal);
			} catch {
				// deliberately swallow
			}
			return result;
		},

		async upsertGraphEdges(
			input: {
				workspaceId?: string;
				projectId?: string;
				edges: GraphEdgeInput[];
			},
			signal?: AbortSignal,
		): Promise<{ edges: GraphEdgeInput[] }> {
			if (writePolicy === "local-only")
				return local.upsertGraphEdges(input, signal);
			if (writePolicy === "cloud-only")
				return cloud.upsertGraphEdges(input, signal);
			const result = await primaryWrite().upsertGraphEdges(input, signal);
			try {
				await secondaryWrite().upsertGraphEdges(input, signal);
			} catch {
				// deliberately swallow
			}
			return result;
		},

		async graphNeighbors(
			input: GraphNeighborsInput,
			signal?: AbortSignal,
		): Promise<{
			items: Array<{
				node: GraphNodeInput;
				edge: GraphEdgeInput;
				direction: "in" | "out";
			}>;
			nextCursor?: string;
		}> {
			return readOptional("graphNeighbors", [input], signal);
		},

		async graphPath(
			input: GraphPathInput,
			signal?: AbortSignal,
		): Promise<GraphPathResult> {
			return readOptional("graphPath", [input], signal);
		},

		async listGraphNodes(
			input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphNodeInput[]; nextCursor?: string }> {
			return readOptional("listGraphNodes", [input], signal);
		},

		async listGraphEdges(
			input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphEdgeInput[]; nextCursor?: string }> {
			return readOptional("listGraphEdges", [input], signal);
		},

		async syncPush(
			input: SyncPushInput,
			signal?: AbortSignal,
		): Promise<SyncPushResult> {
			return cloud.syncPush(input, signal);
		},

		async syncPull(
			input: SyncPullInput,
			signal?: AbortSignal,
		): Promise<SyncPullResult> {
			return cloud.syncPull(input, signal);
		},

		async syncStatus(
			input?: SyncStatusInput,
			signal?: AbortSignal,
		): Promise<SyncStatusResult> {
			return cloud.syncStatus(input, signal);
		},
	};

	async function readOptional(
		method: string,
		args: unknown[],
		signal?: AbortSignal,
	): Promise<any> {
		if (readPolicy === "local-only") return call(local, method, args, signal);
		if (readPolicy === "cloud-only") return call(cloud, method, args, signal);
		try {
			return await call(primaryRead(), method, args, signal);
		} catch {
			return call(secondaryRead(), method, args, signal);
		}
	}

	async function hybridRecall(
		input: RecallInput,
		signal?: AbortSignal,
	): Promise<RecallResult> {
		if (readPolicy === "local-only") return local.recall(input, signal);
		if (readPolicy === "cloud-only") return cloud.recall(input, signal);
		const warnings: string[] = [];
		const [first, second] = await Promise.allSettled([
			primaryRead().recall(input, signal),
			secondaryRead().recall(input, signal),
		]);
		const items: RecallItem[] = [];
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
	}
}

function call(
	target: Record<string, unknown>,
	method: string,
	args: unknown[],
	signal?: AbortSignal,
): Promise<unknown> {
	const fn = target[method];
	if (typeof fn !== "function") {
		throw new Error(`Runtime method ${method} is not available.`);
	}
	return (fn as AnyFn)(...args, signal);
}

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
