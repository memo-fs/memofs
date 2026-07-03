/**
 * Cloudflare Workers AI frontier extractor (Q18).
 *
 * Implements core's provider-neutral {@link Extractor} contract against a
 * Cloudflare Workers AI binding (`env.AI`). The model emits a structured
 * subject–predicate–object representation of the facts in the input text; this
 * adapter parses it into `GraphNode` / `GraphEdge` using the *same relation
 * vocabulary* the rule-based extractor and the `FakeExtractor` use
 * (`uses`/`depends_on`/`prefers`/`blocks`/`supersedes`/`owns`/`related_to`), so
 * the graph stays consistent regardless of which extractor produced it.
 *
 * Q33 margin guardrail: on the Free tier the deterministic rule-based extractor
 * runs (zero LLM spend); Pro+ gets this frontier extractor (the Q18
 * monetization lever). Either way the write fan-out calls the same
 * {@link Extractor} shape.
 *
 * The `Ai` coupling lives in this adapter, never in core (AGENTS.md:
 * provider-neutral contracts). Defensive parsing: malformed LLM output never
 * throws — it returns an empty `{ nodes, edges }` so the write path stays
 * resilient, and the rule-based extractor remains available as the fallback.
 *
 * @public
 */

import type {
	ExtractionContradiction,
	ExtractionInput,
	ExtractionResult,
	Extractor,
	GraphEdge,
	GraphNode,
	GraphNodeType,
	GraphSourceRef,
} from "@tekmemo/core";

/** Default Workers AI text-generation model (overridable via options). */
const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

/** The relation vocabulary the prompt asks the model to emit. */
const RELATION_TYPES = new Set([
	"uses",
	"depends_on",
	"prefers",
	"blocks",
	"supersedes",
	"owns",
	"related_to",
]);

/** A parsed fact the model is instructed to emit (one subject–pred–object). */
interface ParsedFact {
	from: string;
	type: string;
	to: string;
}

/** Options for {@link createWorkersAiExtractor}. */
export interface CreateWorkersAiExtractorOptions {
	/** The Cloudflare Workers AI binding (`env.AI`). */
	ai: Ai;
	/** Model id (defaults to {@link DEFAULT_MODEL}). */
	model?: string;
	/** Default node type assigned to extracted entities. Defaults to `"concept"`. */
	defaultNodeType?: GraphNodeType;
	/**
	 * Whether to stamp the supplied `sourceRef` onto every emitted node/edge.
	 * Defaults to `true` (the extractor contract expects provenance).
	 */
	stampProvenance?: boolean;
}

/**
 * Creates a frontier {@link Extractor} backed by a Cloudflare Workers AI
 * binding.
 *
 * @example
 * ```ts
 * import { createWorkersAiExtractor } from "@tekmemo/adapter-workers-ai";
 *
 * const extractor = createWorkersAiExtractor({ ai: env.AI });
 * ```
 *
 * @public
 */
export function createWorkersAiExtractor(
	options: CreateWorkersAiExtractorOptions,
): Extractor {
	const ai = options.ai;
	const model = options.model ?? DEFAULT_MODEL;
	const defaultNodeType = options.defaultNodeType ?? "concept";
	const stampProvenance = options.stampProvenance ?? true;
	const name = `workers-ai:${model}`;

	return {
		name,
		async extract(input: ExtractionInput): Promise<ExtractionResult> {
			const maxFacts = input.maxFacts ?? 100;
			const nodeType = input.defaultNodeType ?? defaultNodeType;
			const sourceRefs = stampProvenance
				? input.sourceRef === undefined
					? undefined
					: [input.sourceRef]
				: undefined;

			const facts = await runModel(ai, model, input.text, maxFacts);

			const nodes = new Map<string, GraphNode>();
			const edges: GraphEdge[] = [];
			const contradictions: ExtractionContradiction[] = [];

			for (const fact of facts) {
				if (edges.length >= maxFacts) break;
				const fromId = nodeKey(fact.from);
				const toId = nodeKey(fact.to);
				ensureNode(nodes, fact.from, fromId, nodeType, sourceRefs);
				ensureNode(nodes, fact.to, toId, nodeType, sourceRefs);

				const edge: GraphEdge = {
					from: fromId,
					to: toId,
					type: fact.type,
					directed: true,
					weight: 1,
					confidence: 0.8,
					...(sourceRefs === undefined ? {} : { sourceRefs }),
				};
				edges.push(edge);

				if (fact.type === "supersedes") {
					contradictions.push({ from: fromId, to: toId, type: "supersedes" });
				}
			}

			return {
				nodes: [...nodes.values()],
				edges,
				...(contradictions.length === 0 ? {} : { contradictions }),
				model: name,
			};
		},
	};
}

/**
 * Calls the model and parses its JSON output into facts. Defensive: any failure
 * (network error, non-JSON, missing fields, unknown relation) returns `[]` —
 * the write fan-out never breaks on bad LLM output.
 */
async function runModel(
	ai: Ai,
	model: string,
	text: string,
	maxFacts: number,
): Promise<ParsedFact[]> {
	const response = await ai.run(model, {
		// Ask for a compact JSON array so parsing is reliable across models.
		messages: [
			{
				role: "system",
				content: buildSystemPrompt(maxFacts),
			},
			{ role: "user", content: text },
		],
		response_format: { type: "json_schema", json_schema: RESPONSE_SCHEMA },
	});

	const content = extractContent(response);
	if (content === null) return [];
	return parseFacts(content);
}

const RESPONSE_SCHEMA = {
	name: "facts",
	schema: {
		type: "object",
		properties: {
			facts: {
				type: "array",
				items: {
					type: "object",
					properties: {
						from: { type: "string" },
						type: {
							type: "string",
							enum: [
								"uses",
								"depends_on",
								"prefers",
								"blocks",
								"supersedes",
								"owns",
								"related_to",
							],
						},
						to: { type: "string" },
					},
					required: ["from", "type", "to"],
				},
			},
		},
		required: ["facts"],
	},
};

/** The system prompt instructing the model on the exact output shape. */
function buildSystemPrompt(maxFacts: number): string {
	return [
		"You extract factual subject-predicate-object relationships from text into a JSON object.",
		"Each fact has a subject (`from`), a relation (`type`), and an object (`to`).",
		`Use ONLY these relation types: ${[...RELATION_TYPES].join(", ")}.`,
		"`from` and `to` are short noun phrases (entities/concepts). Lowercase them.",
		"Use `supersedes` when one thing replaces/deprecates another.",
		`Output at most ${maxFacts} facts.`,
		'Respond with JSON shaped {"facts":[{...}]}. If there are no recognizable facts, return {"facts":[]}.',
	].join(" ");
}

/**
 * Pulls the model's text content out of the response across the shapes Workers
 * AI text-generation models return (`{ response }`, `{ result: { response } }`,
 * or a `{ choices }` chat shape). Defensive: returns `null` on any miss.
 */
function extractContent(response: Record<string, unknown>): string | null {
	if (typeof response.response === "string") return response.response;
	const result = response.result as Record<string, unknown> | undefined;
	if (result && typeof result.response === "string") return result.response;
	const choices = response.choices as
		| Array<{ message?: { content?: string } }>
		| undefined;
	if (Array.isArray(choices)) {
		const content = choices[0]?.message?.content;
		if (typeof content === "string") return content;
	}
	return null;
}

/** Parses the model's JSON content into typed, validated facts. */
function parseFacts(content: string): ParsedFact[] {
	const parsed = safeJsonParse(content);
	if (!parsed || !Array.isArray(parsed.facts)) return [];
	const out: ParsedFact[] = [];
	for (const raw of parsed.facts) {
		if (!isPlainObject(raw)) continue;
		const from = asNonEmptyString(raw.from);
		const to = asNonEmptyString(raw.to);
		const type = asNonEmptyString(raw.type);
		if (!from || !to || !type) continue;
		if (!RELATION_TYPES.has(type)) continue;
		out.push({ from, type, to });
	}
	return out;
}

function safeJsonParse(text: string): { facts?: unknown } | null {
	// Models occasionally wrap JSON in prose / fences; extract the first object.
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start === -1 || end === -1 || end <= start) return null;
	try {
		return JSON.parse(text.slice(start, end + 1)) as { facts?: unknown };
	} catch {
		return null;
	}
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null;
}

function asNonEmptyString(v: unknown): string | undefined {
	return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function nodeKey(label: string): string {
	return label.toLowerCase().replace(/\s+/g, "-");
}

function ensureNode(
	nodes: Map<string, GraphNode>,
	label: string,
	id: string,
	type: GraphNodeType,
	sourceRefs: GraphSourceRef[] | undefined,
): void {
	const existing = nodes.get(id);
	if (existing) {
		if (existing.label !== label && !existing.aliases?.includes(label)) {
			existing.aliases = [...(existing.aliases ?? []), label];
		}
		return;
	}
	nodes.set(id, {
		id,
		type,
		label,
		...(sourceRefs === undefined ? {} : { sourceRefs }),
	});
}
