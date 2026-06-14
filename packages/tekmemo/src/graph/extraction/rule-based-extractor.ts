import type {
	GraphEdge,
	GraphNode,
	RuleBasedExtractionInput,
	RuleBasedExtractionResult,
} from "../types";
import { stableNodeId } from "../utils/ids";
import { validateLimit } from "../utils/validation";

const MAX_TEXT_LENGTH = 250_000;

const RELATION_RULES: Array<{ type: string; pattern: RegExp }> = [
	{ type: "uses", pattern: /^(.+?)\s+(?:uses|use|is using)\s+(.+?)$/i },
	{
		type: "depends_on",
		pattern: /^(.+?)\s+(?:depends on|requires|needs)\s+(.+?)$/i,
	},
	{ type: "prefers", pattern: /^(.+?)\s+(?:prefers|likes)\s+(.+?)$/i },
	{ type: "blocks", pattern: /^(.+?)\s+(?:blocks|is blocking)\s+(.+?)$/i },
	{
		type: "supersedes",
		pattern: /^(.+?)\s+(?:supersedes|replaces|deprecates)\s+(.+?)$/i,
	},
	{ type: "owns", pattern: /^(.+?)\s+(?:owns|maintains)\s+(.+?)$/i },
	{ type: "related_to", pattern: /^(.+?)\s*(?:->|=>)\s*(.+?)$/i },
];

const ARROW_TRIPLE =
	/^(.+?)\s*(?:->|=>)\s*([a-zA-Z_][a-zA-Z0-9_-]{1,64})\s*(?:->|=>)\s*(.+?)$/;

export function extractGraphFactsRuleBased(
	input: RuleBasedExtractionInput,
): RuleBasedExtractionResult {
	if (typeof input.text !== "string")
		throw new TypeError("text must be a string.");
	if (input.text.length > MAX_TEXT_LENGTH)
		throw new RangeError(`text exceeds ${MAX_TEXT_LENGTH} characters.`);

	const maxFacts = validateLimit(input.maxFacts, 100, 1000);
	const defaultNodeType = input.defaultNodeType ?? "concept";
	const nodes = new Map<string, GraphNode>();
	const edges: GraphEdge[] = [];

	for (const rawLine of input.text.split(/\r?\n/)) {
		if (edges.length >= maxFacts) break;

		const line = cleanupLine(rawLine);
		if (!line) continue;

		const arrow = line.match(ARROW_TRIPLE);
		if (arrow?.[1] && arrow[2] && arrow[3]) {
			addFact(arrow[1], arrow[2], arrow[3]);
			continue;
		}

		for (const rule of RELATION_RULES) {
			const match = line.match(rule.pattern);
			if (match?.[1] && match[2]) {
				addFact(match[1], rule.type, match[2]);
				break;
			}
		}
	}

	return { nodes: Array.from(nodes.values()), edges };

	function addFact(subject: string, relation: string, object: string): void {
		const subjectLabel = normalizeLabel(subject);
		const objectLabel = normalizeLabel(object);
		if (!subjectLabel || !objectLabel || subjectLabel === objectLabel) return;

		const from = stableNodeId(defaultNodeType, subjectLabel);
		const to = stableNodeId(defaultNodeType, objectLabel);

		if (!nodes.has(from)) {
			nodes.set(from, {
				id: from,
				type: defaultNodeType,
				label: subjectLabel,
				sourceRefs: input.sourceRef ? [input.sourceRef] : undefined,
				confidence: 0.6,
				metadata: { extractor: "rule-based" },
			});
		}
		if (!nodes.has(to)) {
			nodes.set(to, {
				id: to,
				type: defaultNodeType,
				label: objectLabel,
				sourceRefs: input.sourceRef ? [input.sourceRef] : undefined,
				confidence: 0.6,
				metadata: { extractor: "rule-based" },
			});
		}

		edges.push({
			from,
			to,
			type: relation.toLowerCase().replace(/[^a-z0-9_-]+/g, "_"),
			directed: true,
			weight: 0.6,
			confidence: 0.6,
			sourceRefs: input.sourceRef ? [input.sourceRef] : undefined,
			metadata: { extractor: "rule-based" },
		});
	}
}

function cleanupLine(input: string): string {
	return input
		.replace(/^\s*[-*+]\s+/, "")
		.replace(/^\s*\d+[.)]\s+/, "")
		.replace(/^#+\s*/, "")
		.trim();
}

function normalizeLabel(input: string): string {
	return input
		.replace(/[`*_"']/g, "")
		.replace(/[.;:,]+$/g, "")
		.trim()
		.slice(0, 160);
}
