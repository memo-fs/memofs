import { createHash } from "node:crypto";
import type {
	GraphNode,
	GraphEdge,
	GraphNodeInput,
	GraphEdgeInput,
} from "../../index";

export function hash(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

export function candidateShape(
	id: string,
	vector:
		| { text: string; score: number; metadata?: Record<string, unknown> }
		| undefined,
	lexical:
		| { text: string; score: number; metadata?: Record<string, unknown> }
		| undefined,
) {
	return {
		id,
		text: vector?.text ?? lexical?.text ?? "",
		vectorScore: vector?.score ?? 0,
		lexicalScore: lexical?.score ?? 0,
		...((vector?.metadata ?? lexical?.metadata === undefined)
			? {}
			: {
					metadata: (vector?.metadata ?? lexical?.metadata) as Record<
						string,
						unknown
					>,
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
	return (nodeFsPromise ??= import("node:fs/promises"));
}

export function loadNodePath(): Promise<NodePath> {
	return (nodePathPromise ??= import("node:path"));
}
