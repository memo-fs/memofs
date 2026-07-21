import type { JsonObject } from "../../core/types/json";
import type { GraphEdge, GraphNode } from "../../graph/types";
import type { GraphEdgeInput, GraphNodeInput } from "../types";

/**
 * Produces a stable 64-bit fingerprint for local identifiers.
 *
 * This is not a cryptographic digest; use `sha256Hex` for content integrity.
 * FNV-1a keeps identifier generation synchronous and runtime-neutral.
 */
export function fingerprint(value: string): string {
	let hash = 0xcbf29ce484222325n;
	for (const byte of new TextEncoder().encode(value)) {
		hash ^= BigInt(byte);
		hash = BigInt.asUintN(64, hash * 0x100000001b3n);
	}
	return hash.toString(16).padStart(16, "0");
}

export function candidateShape(
	id: string,
	vector: { text: string; score: number; metadata?: JsonObject } | undefined,
	lexical: { text: string; score: number; metadata?: JsonObject } | undefined,
) {
	return {
		id,
		text: vector?.text ?? lexical?.text ?? "",
		vectorScore: vector?.score ?? 0,
		lexicalScore: lexical?.score ?? 0,
		...((vector?.metadata ?? lexical?.metadata) === undefined
			? {}
			: {
					metadata: vector?.metadata ?? lexical?.metadata,
				}),
	};
}

export function stableEdgeKey(from: string, type: string, to: string): string {
	return `${from}|${type}|${to}`;
}

export function toGraphNodeInput(node: GraphNode): GraphNodeInput {
	return {
		id: node.id,
		type: node.type,
		label: node.label,
		...(node.summary === undefined ? {} : { summary: node.summary }),
		...(node.aliases === undefined ? {} : { aliases: node.aliases }),
		...(node.confidence === undefined ? {} : { confidence: node.confidence }),
		...(node.importance === undefined ? {} : { importance: node.importance }),
		...(node.status === undefined ? {} : { status: node.status }),
		...(node.metadata === undefined ? {} : { metadata: node.metadata }),
		...(node.sourceRefs === undefined ? {} : { sourceRefs: node.sourceRefs }),
	} as GraphNodeInput;
}

export function toGraphEdgeInput(edge: GraphEdge): GraphEdgeInput {
	return {
		id: edge.id,
		from: edge.from,
		to: edge.to,
		type: edge.type,
		directed: edge.directed ?? true,
		...(edge.weight === undefined ? {} : { weight: edge.weight }),
		...(edge.confidence === undefined ? {} : { confidence: edge.confidence }),
		...(edge.dedupeKey === undefined ? {} : { dedupeKey: edge.dedupeKey }),
		...(edge.status === undefined ? {} : { status: edge.status }),
		...(edge.metadata === undefined ? {} : { metadata: edge.metadata }),
		...(edge.sourceRefs === undefined ? {} : { sourceRefs: edge.sourceRefs }),
	} as GraphEdgeInput;
}

export function snapshotId(label?: string): string {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const suffix = label
		?.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_.-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return suffix ? `snap_${timestamp}_${suffix}` : `snap_${timestamp}`;
}

export function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export type NodeFs = typeof import("node:fs/promises");
export type NodePath = typeof import("node:path");
let nodeFsPromise: Promise<NodeFs> | undefined;
let nodePathPromise: Promise<NodePath> | undefined;

export function loadNodeFs(): Promise<NodeFs> {
	if (!nodeFsPromise) nodeFsPromise = import("node:fs/promises");
	return nodeFsPromise;
}

export function loadNodePath(): Promise<NodePath> {
	if (!nodePathPromise) nodePathPromise = import("node:path");
	return nodePathPromise;
}
