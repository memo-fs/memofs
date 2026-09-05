import {
	AgentFsDiagram,
	BehaviorEnforcementDiagram,
	CodeAnchoringDiagram,
	CognitiveDecayDiagram,
	EntityGraphDiagram,
	HybridRecallDiagram,
} from "./implemented-diagrams";
import {
	ActionReceiptsDiagram,
	EphemeralStreamDiagram,
	MemoryLinterDiagram,
	MemoryStudioDiagram,
	ProceduralPlaybookDiagram,
	VendorMemoryImportDiagram,
} from "./pending-diagrams";
import type { FeatureItem } from "./types";

export const FEATURES: FeatureItem[] = [
	{
		id: "code-anchoring",
		numberLabel: "FEATURE 01",
		title: "Project Anchoring & Drift Detection",
		description:
			"Memories bind directly to project files, research documents, data schemas, byte hashes, and symbol paths. When underlying assets change, query-time drift detection automatically demotes stale memory relevance before it causes hallucinations.",
		badge: "Drift Defense",
		isImplemented: true,
		diagram: CodeAnchoringDiagram,
	},
	{
		id: "hybrid-fusion",
		numberLabel: "FEATURE 02",
		title: "Hybrid Recall & Gated Fusion",
		description:
			"Sub-millisecond BM25 lexical keyword matching fused with dense vector embeddings via bounded gated-bonus ranking. Unifies memory chunk identity to eliminate duplicate hits and avoid LLM context bloat.",
		badge: "Gated Fusion",
		isImplemented: true,
		diagram: HybridRecallDiagram,
	},
	{
		id: "entity-graph",
		numberLabel: "FEATURE 03",
		title: "Entity Graph & Causal Provenance",
		description:
			"Extracts entities, relationships, and causal lineage (memofs why) into transparent nodes.jsonl and edges.jsonl files. Deterministic and critic-gated consolidation merges redundant facts and traces decisions back to source evidence.",
		badge: "Graph Native",
		isImplemented: true,
		diagram: EntityGraphDiagram,
	},
	{
		id: "agentfs-scratchpads",
		numberLabel: "FEATURE 04",
		title: "AgentFS Workspace Scratchpads",
		description:
			"Isolated scratch filesystem per agent turn with outcome-gated memory promotion (success, failure, aborted). Automatically preserves and promotes high-signal durable facts while pruning intermediate session noise.",
		badge: "Isolated Context",
		isImplemented: true,
		diagram: AgentFsDiagram,
	},
	{
		id: "behavior-enforcement",
		numberLabel: "FEATURE 05",
		title: "Runtime Behavior Enforcement",
		description:
			"Deterministic push hooks across 9+ AI tools and agent environments including Claude Code, Cursor, Copilot, Codex, and Gemini CLI. Automatically injects relevant memory context at session start, enforces project constraints, and preserves state across context compactions.",
		badge: "Zero Omission",
		isImplemented: true,
		diagram: BehaviorEnforcementDiagram,
	},
	{
		id: "cognitive-decay",
		numberLabel: "FEATURE 06",
		title: "Cognitive Decay & Cold Archive",
		description:
			"Memory-kind expiry windows age facts into unverified status without manual maintenance. Operator-guided consolidation moves superseded memories to cold archive with full forensic restoration.",
		badge: "Decay Floors",
		isImplemented: true,
		diagram: CognitiveDecayDiagram,
	},
	{
		id: "ephemeral-stream",
		numberLabel: "FEATURE 07",
		title: "Ephemeral Stream & Agent Pub/Sub",
		description:
			"Real-time append-only stream for transient cross-agent coordination (heartbeats, file intent, task status) and human steering hints. Filtered out of durable recall to eliminate noise, with automated TTL garbage collection on maintenance runs.",
		badge: "Coming Soon",
		isImplemented: false,
		diagram: EphemeralStreamDiagram,
	},
	{
		id: "procedural-memory",
		numberLabel: "FEATURE 08",
		title: "Procedural Memory & Playbooks",
		description:
			"Actionable step-by-step workflow recipes and standard operating procedures stored as human-readable Markdown and structured JSON. Context strategist dynamically matches and surfaces relevant playbooks based on task type.",
		badge: "Coming Soon",
		isImplemented: false,
		diagram: ProceduralPlaybookDiagram,
	},
	{
		id: "memory-linter",
		numberLabel: "FEATURE 09",
		title: "Static Memory Linter",
		description:
			"Semantic static analyzer CLI (memofs lint) for CI/CD pipelines. Detects contradictory assertions across stored notes, broken causal provenance links, dead project references, and orphaned knowledge graph entities before merge.",
		badge: "Coming Soon",
		isImplemented: false,
		diagram: MemoryLinterDiagram,
	},
	{
		id: "memory-studio",
		numberLabel: "FEATURE 10",
		title: "Visual Memory Studio",
		description:
			"Local zero-dependency webview debugger for .memofs/. Inspect BM25 vs vector vs graph recall weight breakdowns, explore interactive entity graphs, and test snapshot rollback diffs in real time.",
		badge: "Coming Soon",
		isImplemented: false,
		diagram: MemoryStudioDiagram,
	},
	{
		id: "memory-import",
		numberLabel: "FEATURE 11",
		title: "Vendor Memory Import & Setup",
		description:
			"One command to bring your existing memory with you — import from developer tools, research agents, plus Mem0, Zep/Graphiti, Letta, and Cognee exports. Full offline file adapters write through the standard durable path with provenance and dry-run preview.",
		badge: "Coming Soon",
		isImplemented: false,
		diagram: VendorMemoryImportDiagram,
	},
	{
		id: "action-receipts",
		numberLabel: "FEATURE 12",
		title: "Immutable Action Receipts",
		description:
			"Append-only audit receipts capturing consequential AI actions, task correlation, causal parentage, reversibility metadata, argument digests, and before/after snapshot hashes for complete execution accountability.",
		badge: "Coming Soon",
		isImplemented: false,
		diagram: ActionReceiptsDiagram,
	},
];
