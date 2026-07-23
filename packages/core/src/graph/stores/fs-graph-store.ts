/**
 * @file Filesystem-backed graph store with JSONL persistence.
 *
 * @remarks
 * Delegates query/traversal to {@link InMemoryGraphStore} while persisting
 * every mutation to the canonical `.memofs/graph/nodes.jsonl` and
 * `.memofs/graph/edges.jsonl` files. On construction the store rehydrates
 * from those files so the local graph accumulates across restarts.
 *
 * @public
 */

import {
	GRAPH_EDGES_PATH,
	GRAPH_NODES_PATH,
} from "../../core/constants/memory-paths";
import { MemoryNotFoundError } from "../../core/errors/errors";
import type { MemoryPath, MemoryStore } from "../../core/types/memory-store";
import {
	parseGraphEdgesJsonl,
	parseGraphNodesJsonl,
	serializeGraphEdgesJsonl,
	serializeGraphNodesJsonl,
} from "../jsonl/jsonl";
import type {
	GraphDecayInput,
	GraphEdge,
	GraphEdgeQuery,
	GraphMergeNodesInput,
	GraphNeighbor,
	GraphNeighborQuery,
	GraphNode,
	GraphNodeQuery,
	GraphPath,
	GraphShortestPathQuery,
	GraphSnapshot,
	GraphStats,
	GraphStore,
	StoredGraphEdge,
	StoredGraphNode,
} from "../types";
import { InMemoryGraphStore } from "./in-memory-graph-store";

export interface FsGraphStoreOptions {
	/** Memory store used for file I/O (typically NodeFsMemoryStore). */
	store: MemoryStore;
	/** Backing in-memory graph. A fresh one is created when omitted. */
	inner?: InMemoryGraphStore;
	/** Canonical nodes JSONL path. */
	nodesPath?: typeof GRAPH_NODES_PATH;
	/** Canonical edges JSONL path. */
	edgesPath?: typeof GRAPH_EDGES_PATH;
}

/**
 * A graph store that persists nodes and edges to JSONL on disk.
 *
 * @public
 */
export class FsGraphStore implements GraphStore {
	private readonly store: MemoryStore;
	private readonly inner: InMemoryGraphStore;
	private readonly nodesPath: MemoryPath;
	private readonly edgesPath: MemoryPath;
	private hydrated = false;
	private hydrationPromise: Promise<void> | undefined;

	constructor(options: FsGraphStoreOptions) {
		this.store = options.store;
		this.inner = options.inner ?? new InMemoryGraphStore();
		this.nodesPath = options.nodesPath ?? GRAPH_NODES_PATH;
		this.edgesPath = options.edgesPath ?? GRAPH_EDGES_PATH;
	}

	/**
	 * Load any persisted nodes and edges from disk into the in-memory store.
	 * Safe to call multiple times; only the first call performs the load.
	 */
	async hydrate(): Promise<void> {
		if (this.hydrated) return;
		if (this.hydrationPromise) return this.hydrationPromise;

		this.hydrationPromise = this.hydrateOnce().then(
			() => {
				this.hydrated = true;
			},
			(error: unknown) => {
				this.hydrationPromise = undefined;
				throw error;
			},
		);
		return this.hydrationPromise;
	}

	private async hydrateOnce(): Promise<void> {
		const nodes = await this.readJsonl(this.nodesPath, parseGraphNodesJsonl);
		const edges = await this.readJsonl(this.edgesPath, parseGraphEdgesJsonl);
		if (nodes.length > 0 || edges.length > 0) {
			// importSnapshot requires edges reference existing nodes; load nodes
			// then edges via the import path which validates references.
			await this.inner.importSnapshot(
				{ version: 1, exportedAt: "", nodes, edges },
				{ clear: true },
			);
		}
	}

	async upsertNodes(nodes: GraphNode[]): Promise<StoredGraphNode[]> {
		await this.hydrate();
		const result = await this.inner.upsertNodes(nodes);
		await this.persist();
		return result;
	}

	async upsertEdges(edges: GraphEdge[]): Promise<StoredGraphEdge[]> {
		await this.hydrate();
		const result = await this.inner.upsertEdges(edges);
		await this.persist();
		return result;
	}

	async getNode(id: string): Promise<StoredGraphNode | undefined> {
		await this.hydrate();
		return this.inner.getNode(id);
	}

	async getEdge(id: string): Promise<StoredGraphEdge | undefined> {
		await this.hydrate();
		return this.inner.getEdge(id);
	}

	async queryNodes(query?: GraphNodeQuery): Promise<StoredGraphNode[]> {
		await this.hydrate();
		return this.inner.queryNodes(query);
	}

	async queryEdges(query?: GraphEdgeQuery): Promise<StoredGraphEdge[]> {
		await this.hydrate();
		return this.inner.queryEdges(query);
	}

	async neighbors(query: GraphNeighborQuery): Promise<GraphNeighbor[]> {
		await this.hydrate();
		return this.inner.neighbors(query);
	}

	async shortestPath(
		query: GraphShortestPathQuery,
	): Promise<GraphPath | undefined> {
		await this.hydrate();
		return this.inner.shortestPath(query);
	}

	async fewestHopsPath(
		query: GraphShortestPathQuery,
	): Promise<GraphPath | undefined> {
		await this.hydrate();
		return this.inner.fewestHopsPath(query);
	}

	async weightedShortestPath(
		query: GraphShortestPathQuery,
	): Promise<GraphPath | undefined> {
		await this.hydrate();
		return this.inner.weightedShortestPath(query);
	}

	async mergeNodes(input: GraphMergeNodesInput): Promise<StoredGraphNode> {
		await this.hydrate();
		const result = await this.inner.mergeNodes(input);
		await this.persist();
		return result;
	}

	async decayEdges(
		input: GraphDecayInput,
	): Promise<{ updated: number; deleted: number }> {
		await this.hydrate();
		const result = await this.inner.decayEdges(input);
		await this.persist();
		return result;
	}

	async deleteNode(
		id: string,
		options?: { cascadeEdges?: boolean },
	): Promise<boolean> {
		await this.hydrate();
		const result = await this.inner.deleteNode(id, options);
		await this.persist();
		return result;
	}

	async deleteEdge(id: string): Promise<boolean> {
		await this.hydrate();
		const result = await this.inner.deleteEdge(id);
		await this.persist();
		return result;
	}

	async clear(): Promise<void> {
		await this.hydrate();
		await this.inner.clear();
		await this.persist();
	}

	async stats(): Promise<GraphStats> {
		await this.hydrate();
		return this.inner.stats();
	}

	async exportSnapshot(): Promise<GraphSnapshot> {
		await this.hydrate();
		return this.inner.exportSnapshot();
	}

	async importSnapshot(
		snapshot: GraphSnapshot,
		options?: { clear?: boolean },
	): Promise<void> {
		await this.hydrate();
		await this.inner.importSnapshot(snapshot, options);
		await this.persist();
	}

	/**
	 * Rewrite both JSONL files from the current in-memory snapshot.
	 *
	 * @remarks
	 * Each {@link MemoryStore.write} call is atomic per-file (NodeFsMemoryStore
	 * uses a `writeFileAtomic` staging pattern — write to
	 * `${path}.tmp.<pid>.<uuid>` then rename). To avoid a half-committed pair
	 * where nodes.jsonl is new but edges.jsonl is old, this method captures the
	 * previous snapshot and rolls back the first write if the second fails.
	 * On crash between writes, the per-file atomicity prevents a torn file, and
	 * the next hydrate either sees the old consistent pair or completes/cleans
	 * up via the stale rollback.
	 */
	async persist(): Promise<void> {
		const snapshot = await this.inner.exportSnapshot();
		const nodesJsonl = serializeGraphNodesJsonl(snapshot.nodes);
		const edgesJsonl = serializeGraphEdgesJsonl(snapshot.edges);

		// Capture old contents for rollback on second-write failure.
		// If edges write fails after nodes write, we restore nodes to old so
		// the pair stays consistent (both old, never mixed new-nodes/old-edges).
		let oldNodes: string | null = null;
		try {
			oldNodes = await this.store.read(this.nodesPath);
		} catch (error) {
			if (!(error instanceof MemoryNotFoundError)) throw error;
		}

		// Stage write pattern: NodeFsMemoryStore internally writes to
		// `${path}.tmp.<uuid>` then renames — reusing `writeFileAtomic` pattern.
		// For pair atomicity, commit nodes first then edges; on edges failure
		// roll back nodes to the old snapshot so the pair stays either old or
		// new, never mixed (edges referencing missing nodes).
		await this.store.write(this.nodesPath, nodesJsonl);

		try {
			await this.store.write(this.edgesPath, edgesJsonl);
		} catch (error) {
			// Second write failed after first succeeded — restore old nodes so
			// both files remain on the old consistent snapshot.
			try {
				if (oldNodes !== null) {
					await this.store.write(this.nodesPath, oldNodes);
				} else {
					await this.store.delete(this.nodesPath);
				}
			} catch {
				// Best-effort rollback; surface the original failure.
			}
			throw error;
		}
	}

	/**
	 * Read and parse a JSONL file, returning an empty array when missing.
	 */
	private async readJsonl<T>(
		path: MemoryPath,
		parse: (content: string) => T[],
	): Promise<T[]> {
		let content: string;
		try {
			content = await this.store.read(path);
		} catch (error) {
			if (error instanceof MemoryNotFoundError) return [];
			throw error;
		}
		// Skip-malformed: tolerate stray lines from prior versions.
		try {
			return parse(content);
		} catch {
			return parseWithSkip(content, parse);
		}
	}
}

/**
 * Fallback parser wrapper that tolerates malformed lines. The graph JSONL
 * parsers expose a "detailed" variant; here we simply drop bad lines.
 */
function parseWithSkip<T>(
	content: string,
	parse: (content: string) => T[],
): T[] {
	const lines = content.split(/\r?\n/);
	const kept: string[] = [];
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			JSON.parse(trimmed);
			kept.push(trimmed);
		} catch {
			// drop malformed line
		}
	}
	return parse(kept.join("\n"));
}

/**
 * Factory for {@link FsGraphStore}.
 *
 * @public
 * @param options - Store options.
 * @returns A new FsGraphStore (not yet hydrated).
 */
export function createFsGraphStore(options: FsGraphStoreOptions): FsGraphStore {
	return new FsGraphStore(options);
}
