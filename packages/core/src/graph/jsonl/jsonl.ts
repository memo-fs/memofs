import { MemoryParseError } from "../../core/errors/errors";
import { parseJsonl as coreParseJsonl } from "../../core/validation/jsonl";
import { GraphParseError, GraphValidationError } from "../errors/graph-errors";
import type {
	GraphEdge,
	GraphNode,
	GraphSnapshot,
	StoredGraphEdge,
	StoredGraphNode,
} from "../types";
import { assertIsoDate } from "../utils/time";
import { normalizeEdge, normalizeNode } from "../utils/validation";

export interface JsonlParseIssue {
	line: number;
	message: string;
	raw: string;
}

export interface JsonlParseOptions {
	onInvalidLine?: "throw" | "skip";
}

export interface JsonlParseResult<T> {
	rows: T[];
	issues: JsonlParseIssue[];
}

export function serializeGraphNodesJsonl(nodes: GraphNode[]): string {
	if (!Array.isArray(nodes))
		throw new GraphValidationError("nodes must be an array.");
	return (
		nodes.map((node) => JSON.stringify(normalizeNode(node))).join("\n") +
		(nodes.length > 0 ? "\n" : "")
	);
}

export function serializeGraphEdgesJsonl(edges: GraphEdge[]): string {
	if (!Array.isArray(edges))
		throw new GraphValidationError("edges must be an array.");
	return (
		edges
			.map((edge) =>
				JSON.stringify(normalizeEdge(edge, { allowSelfEdges: true })),
			)
			.join("\n") + (edges.length > 0 ? "\n" : "")
	);
}

export function parseGraphNodesJsonl(
	input: string,
	options?: JsonlParseOptions,
): StoredGraphNode[] {
	const result = parseGraphNodesJsonlDetailed(input, options);
	return result.rows;
}

export function parseGraphEdgesJsonl(
	input: string,
	options?: JsonlParseOptions,
): StoredGraphEdge[] {
	const result = parseGraphEdgesJsonlDetailed(input, options);
	return result.rows;
}

export function parseGraphNodesJsonlDetailed(
	input: string,
	options?: JsonlParseOptions,
): JsonlParseResult<StoredGraphNode> {
	return parseJsonl(
		input,
		"node",
		(value) => normalizeNode(value as GraphNode),
		options,
	);
}

export function parseGraphEdgesJsonlDetailed(
	input: string,
	options?: JsonlParseOptions,
): JsonlParseResult<StoredGraphEdge> {
	return parseJsonl(
		input,
		"edge",
		(value) => normalizeEdge(value as GraphEdge, { allowSelfEdges: true }),
		options,
	);
}

export function serializeGraphSnapshot(snapshot: GraphSnapshot): string {
	return JSON.stringify(normalizeGraphSnapshot(snapshot), null, 2);
}

export function parseGraphSnapshot(input: string): GraphSnapshot {
	if (typeof input !== "string")
		throw new GraphParseError("Graph snapshot input must be a string.");
	try {
		const value = JSON.parse(input) as GraphSnapshot;
		return normalizeGraphSnapshot(value);
	} catch (error) {
		if (error instanceof GraphParseError) throw error;
		if (error instanceof GraphValidationError)
			throw new GraphParseError(error.message, { cause: error });
		throw new GraphParseError("Invalid graph snapshot JSON.", { cause: error });
	}
}

export function normalizeGraphSnapshot(value: GraphSnapshot): GraphSnapshot {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new GraphValidationError("Invalid graph snapshot shape.");
	}
	if (value.version !== 1)
		throw new GraphValidationError("Unsupported graph snapshot version.");
	if (!Array.isArray(value.nodes))
		throw new GraphValidationError("snapshot.nodes must be an array.");
	if (!Array.isArray(value.edges))
		throw new GraphValidationError("snapshot.edges must be an array.");
	assertIsoDate(value.exportedAt, "snapshot.exportedAt");

	const nodeIds = new Set<string>();
	const nodes = value.nodes.map((node, index) => {
		try {
			const normalized = normalizeNode(node);
			if (nodeIds.has(normalized.id))
				throw new GraphValidationError(
					`Duplicate snapshot node id "${normalized.id}".`,
				);
			nodeIds.add(normalized.id);
			return normalized;
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Invalid snapshot node.";
			throw new GraphValidationError(
				`Invalid snapshot node at index ${index}: ${message}`,
				{ cause: error },
			);
		}
	});

	const edgeIds = new Set<string>();
	const edges = value.edges.map((edge, index) => {
		try {
			const normalized = normalizeEdge(edge, { allowSelfEdges: true });
			if (edgeIds.has(normalized.id))
				throw new GraphValidationError(
					`Duplicate snapshot edge id "${normalized.id}".`,
				);
			if (!nodeIds.has(normalized.from))
				throw new GraphValidationError(
					`Snapshot edge source node "${normalized.from}" does not exist.`,
				);
			if (!nodeIds.has(normalized.to))
				throw new GraphValidationError(
					`Snapshot edge target node "${normalized.to}" does not exist.`,
				);
			edgeIds.add(normalized.id);
			return normalized;
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Invalid snapshot edge.";
			throw new GraphValidationError(
				`Invalid snapshot edge at index ${index}: ${message}`,
				{ cause: error },
			);
		}
	});

	return { version: 1, exportedAt: value.exportedAt, nodes, edges };
}

function parseJsonl<T>(
	input: string,
	kind: string,
	normalize: (value: unknown) => T,
	options?: JsonlParseOptions,
): JsonlParseResult<T> {
	if (typeof input !== "string")
		throw new GraphParseError(`${kind} JSONL input must be a string.`);

	const onInvalidLine = options?.onInvalidLine ?? "throw";

	try {
		const result = coreParseJsonl(input, {
			mode: onInvalidLine === "skip" ? "skip" : "throw",
			validate: (value) => normalize(value),
		});

		return {
			rows: result.entries,
			issues: result.issues.map((issue) => ({
				line: issue.lineNumber,
				message: issue.message,
				raw: issue.line,
			})),
		};
	} catch (error) {
		if (error instanceof MemoryParseError) {
			throw new GraphParseError(
				`Invalid ${kind} JSONL on line ${error.details?.lineNumber ?? "unknown"}: ${error.message}`,
				{ cause: error },
			);
		}
		throw error;
	}
}
