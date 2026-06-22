import type {
	MinimalExtractionContradiction,
	MinimalExtractionInput,
	MinimalExtractionResult,
	MinimalExtractor,
	MinimalGraphEdge,
	MinimalGraphNode,
	MinimalGraphSourceRef,
} from "../types/contracts";

/**
 * Deterministic in-memory extractor for tests.
 *
 * Mirrors the shape the rule-based extractor produces (one node per entity, one
 * edge per `X <relation> Y` line, `supersedes` facts surfaced as
 * `contradictions`), so it doubles as a reference for adapter packages and as a
 * stand-in for an LLM-backed extractor in consumer tests that don't want to pay
 * the rule-based extractor's regex cost. Rejects empty text and stamps
 * provenance exactly like a real adapter should.
 *
 * @see {@link MinimalExtractor} — the contract this satisfies.
 */
export class FakeExtractor implements MinimalExtractor {
	readonly name = "fake-extractor";
	readonly calls: MinimalExtractionInput[] = [];

	private readonly relations: ReadonlyMap<string, string>;
	private readonly supersedingType: string;
	private readonly stampProvenance: boolean;

	constructor(options?: {
		/**
		 * Map of relation verb → edge `type`. A line `<subject> <verb> <object>`
		 * produces an edge of the mapped type. Defaults to the rule-based
		 * extractor's seven patterns plus `->`/`=>` arrows.
		 */
		relations?: ReadonlyMap<string, string>;
		/** Edge type that expresses "A replaces B". Defaults to `"supersedes"`. */
		supersedingType?: string;
		/** Whether to stamp `sourceRef` onto emitted nodes/edges. Defaults to `true`. */
		stampProvenance?: boolean;
	}) {
		this.relations = options?.relations ?? DEFAULT_RELATIONS;
		this.supersedingType = options?.supersedingType ?? "supersedes";
		this.stampProvenance = options?.stampProvenance ?? true;
	}

	async extract(
		input: MinimalExtractionInput,
	): Promise<MinimalExtractionResult> {
		if (typeof input.text !== "string" || input.text.length === 0) {
			throw new Error("text must be a non-empty string.");
		}

		// Defensive copy so the caller's input shape can't be mutated by reference.
		this.calls.push({
			text: input.text,
			...(input.sourceRef === undefined ? {} : { sourceRef: input.sourceRef }),
			...(input.defaultNodeType === undefined
				? {}
				: { defaultNodeType: input.defaultNodeType }),
			...(input.maxFacts === undefined ? {} : { maxFacts: input.maxFacts }),
			...(input.mode === undefined ? {} : { mode: input.mode }),
		});

		const defaultNodeType = input.defaultNodeType ?? "concept";
		const maxFacts = input.maxFacts ?? 100;
		const sourceRef = input.sourceRef;
		const sourceRefs =
			this.stampProvenance && sourceRef !== undefined ? [sourceRef] : undefined;

		const nodes = new Map<string, MinimalGraphNode>();
		const edges: MinimalGraphEdge[] = [];
		const contradictions: MinimalExtractionContradiction[] = [];

		for (const rawLine of input.text.split(/\r?\n/)) {
			if (edges.length >= maxFacts) break;
			const line = rawLine.trim();
			if (line.length === 0) continue;

			const parsed = parseLine(line, this.relations);
			if (parsed === undefined) continue;

			const { subject, type, object } = parsed;
			ensureNode(nodes, subject, defaultNodeType, sourceRefs);
			ensureNode(nodes, object, defaultNodeType, sourceRefs);

			const edge: MinimalGraphEdge = {
				from: nodeKey(subject),
				to: nodeKey(object),
				type,
				directed: true,
				weight: 1,
				confidence: 1,
				...(sourceRefs === undefined ? {} : { sourceRefs }),
			};

			if (type === this.supersedingType) {
				edge.type = this.supersedingType;
				contradictions.push({
					from: nodeKey(subject),
					to: nodeKey(object),
					type: this.supersedingType,
				});
			}

			edges.push(edge);
		}

		return {
			nodes: [...nodes.values()],
			edges,
			...(contradictions.length === 0 ? {} : { contradictions }),
			model: "fake-extractor",
		};
	}
}

export function createFakeExtractor(options?: {
	relations?: ReadonlyMap<string, string>;
	supersedingType?: string;
	stampProvenance?: boolean;
}): FakeExtractor {
	return new FakeExtractor(options);
}

const DEFAULT_RELATIONS: ReadonlyMap<string, string> = new Map<string, string>([
	["uses", "uses"],
	["use", "uses"],
	["is using", "uses"],
	["depends on", "depends_on"],
	["requires", "depends_on"],
	["needs", "depends_on"],
	["prefers", "prefers"],
	["likes", "prefers"],
	["blocks", "blocks"],
	["is blocking", "blocks"],
	["supersedes", "supersedes"],
	["replaces", "supersedes"],
	["deprecates", "supersedes"],
	["owns", "owns"],
	["maintains", "owns"],
	["->", "related_to"],
	["=>", "related_to"],
]);

function parseLine(
	line: string,
	relations: ReadonlyMap<string, string>,
): { subject: string; type: string; object: string } | undefined {
	// Longest-first so "depends on" wins over "on" / multi-word verbs match first.
	const verbs = [...relations.keys()].sort((a, b) => b.length - a.length);
	for (const verb of verbs) {
		const escaped = verb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const match = line.match(new RegExp(`^(.+?)\\s+${escaped}\\s+(.+?)$`, "i"));
		if (match?.[1] && match[2]) {
			const type = relations.get(verb);
			if (type === undefined) continue;
			return { subject: match[1].trim(), type, object: match[2].trim() };
		}
	}
	return undefined;
}

function nodeKey(label: string): string {
	return label.toLowerCase().replace(/\s+/g, "-");
}

function ensureNode(
	nodes: Map<string, MinimalGraphNode>,
	label: string,
	type: string,
	sourceRefs?: MinimalGraphSourceRef[],
): void {
	const key = nodeKey(label);
	const existing = nodes.get(key);
	if (existing !== undefined) {
		if (!existing.aliases?.includes(label) && existing.label !== label) {
			existing.aliases = [...(existing.aliases ?? []), label];
		}
		return;
	}
	nodes.set(key, {
		id: key,
		type,
		label,
		...(sourceRefs === undefined ? {} : { sourceRefs }),
	});
}
