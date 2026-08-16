export type TicketStage = "frontier" | "next-up" | "planned";

export type TicketStream =
	| "protocol"
	| "intelligence"
	| "security"
	| "devtools"
	| "adapters";

export interface Ticket {
	id: string;
	title: string;
	summary: string;
	stream: TicketStream;
	stage: TicketStage;
	milestone: string;
	packages: string[];
	blockedBy?: string[];
	deliverables?: string[];
}

export interface StreamInfo {
	id: TicketStream;
	name: string;
	shortName: string;
	description: string;
	icon: string;
	color: string;
}

export const STREAMS: StreamInfo[] = [
	{
		id: "protocol",
		name: "Protocol & Ecosystem",
		shortName: "Protocol",
		description:
			"MCP 2026-07-28 spec adoption, discover RPC, prompt cache hints, and open memory standards.",
		icon: "ph:plugs-connected-bold",
		color: "#0891b2",
	},
	{
		id: "intelligence",
		name: "Intelligence & Retrieval",
		shortName: "Intelligence",
		description:
			"Reciprocal Rank Fusion, entity coreference, durability classification, and LLM strategist.",
		icon: "ph:brain-bold",
		color: "#059669",
	},
	{
		id: "security",
		name: "Security, Trust & Privacy",
		shortName: "Security",
		description:
			"Multi-channel write provenance, trust boundary gates, PII detection, and capability controls.",
		icon: "ph:shield-check-bold",
		color: "#b7791f",
	},
	{
		id: "devtools",
		name: "Dev Tools & Studio",
		shortName: "Dev Tools",
		description:
			"MemoFS Studio, visual recall simulator, interactive knowledge graph, playbooks, and linter.",
		icon: "ph:browsers-bold",
		color: "#8b5cf6",
	},
	{
		id: "adapters",
		name: "Storage & Model Adapters",
		shortName: "Adapters",
		description:
			"Native AWS S3 blob storage, PostgreSQL metadata, Workers AI, and OpenAI LLM adapters.",
		icon: "ph:database-bold",
		color: "#ea580c",
	},
];

export const STAGES: { id: TicketStage; label: string; description: string }[] =
	[
		{
			id: "frontier",
			label: "Frontier (Unblocked)",
			description: "Active and unblocked features currently in progress.",
		},
		{
			id: "next-up",
			label: "Next Up",
			description:
				"Next in sequence, queued behind current frontier deliverables.",
		},
		{
			id: "planned",
			label: "Planned",
			description:
				"Architecturally specified vertical slices scheduled for upcoming releases.",
		},
	];

export const TICKETS: Ticket[] = [
	// =========================================================================
	// 1. Protocol & Ecosystem (ADR 0028 & ADR 0027)
	// =========================================================================
	{
		id: "#86",
		title: "Advertise MCP 2026-07-28 Protocol Revision",
		summary:
			"Unblock latest MCP clients over Streamable HTTP on Workers and stdio version negotiation.",
		stream: "protocol",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/mcp-server", "@memofs/json-rpc"],
		deliverables: [
			'Custom protocol version list prepends "2026-07-28" as the advertised latest',
			"Stateless Streamable HTTP gate accepts MCP-Protocol-Version: 2026-07-28 header without 400",
			"Dual-mode backward compatibility for 2025-11-25 and earlier clients intact",
		],
	},
	{
		id: "#87",
		title: "Implement server/discover RPC",
		summary:
			"Allow 2026-07-28 clients to discover server identity, supported versions, and capabilities via dedicated RPC.",
		stream: "protocol",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/mcp-server"],
		blockedBy: ["#86"],
		deliverables: [
			"server/discover RPC returns supportedProtocolVersions, capabilities, and serverInfo",
			"initialize kept in dispatch for full backward compatibility with older clients",
			'HTTP POST with method "server/discover" returns 200 payload',
		],
	},
	{
		id: "#88",
		title: "Cacheable Tool & Resource Envelope Hints",
		summary:
			"Decorate tool/resource lists with resultType and CacheableResult hints for upstream prompt-cache stability.",
		stream: "protocol",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/mcp-server"],
		blockedBy: ["#86"],
		deliverables: [
			'Every JSON-RPC result stamped with resultType: "complete" at dispatch boundary',
			'Static tools/list and resources/list decorated with ttlMs and cacheScope: "public"',
			"Prompt caching hits maximized across agent reconnects without cache churn",
		],
	},
	{
		id: "#89",
		title: "Standardize Resource-Not-Found Error Codes",
		summary:
			"Route unknown resource URI requests to standard JSON-RPC Invalid Params (-32602) per 2026-07-28 spec.",
		stream: "protocol",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/mcp-server", "@memofs/json-rpc"],
		blockedBy: ["#86"],
		deliverables: [
			"resources/read with unknown URI returns error code -32602 instead of -32601",
			"Unknown method dispatch correctly preserved at -32601 (method not found)",
		],
	},
	{
		id: "#90",
		title: "Gateway Header Routing & CORS Acceptance",
		summary:
			"Accept Mcp-Method and Mcp-Name HTTP headers and permit them in CORS for edge gateways and WAF metering.",
		stream: "protocol",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/mcp-server", "@memofs/server"],
		blockedBy: ["#86"],
		deliverables: [
			"POST requests carrying Mcp-Method and Mcp-Name headers accepted and dispatched cleanly",
			"Access-Control-Allow-Headers includes Mcp-Method and Mcp-Name in CORS preflights",
			"Worker-safe runtime free of Node-only imports maintained",
		],
	},
	{
		id: "#91",
		title: "Real HTTP MCP Release Gate Verification",
		summary:
			"Automated release assertion proving 2026-07-28 client discovery and cache hints survive over live network ports.",
		stream: "protocol",
		stage: "planned",
		milestone: "v1.4.0",
		packages: ["@memofs/testing", "@memofs/mcp-server"],
		blockedBy: ["#86", "#87", "#88"],
		deliverables: [
			"Real HTTP client connects over live port and validates server/discover capabilities",
			"Assert CacheableResult headers survive transport boundaries",
		],
	},
	{
		id: "#83",
		title: "Open Memory Specification (OMS) Package",
		summary:
			"Language-agnostic .memofs schema definitions and validator for Python, Rust, and Go runtimes.",
		stream: "protocol",
		stage: "planned",
		milestone: "v2.0",
		packages: ["@memofs/spec"],
		deliverables: [
			"Standalone @memofs/spec package with zero transitive dependencies",
			"JSON schemas generated from TypeScript types for all on-disk files",
			"Collaboration alignment with Agent Memory Protocol (AMP)",
		],
	},
	{
		id: "#84",
		title: "Generate All Schema Shapes for Cross-Spec Portability",
		summary:
			"Auto-generate JSON Schemas for all on-disk shapes (events, nodes, anchors, playbooks, streams).",
		stream: "protocol",
		stage: "planned",
		milestone: "v2.0",
		packages: ["@memofs/spec"],
		blockedBy: ["#83"],
		deliverables: [
			"JSON schemas for manifest, memory-events, graph-nodes, anchor-ref, and playbooks",
			"Automated CI drift check verifying TypeScript types match generated schemas",
		],
	},
	{
		id: "#85",
		title: "OMS Documentation & Specification Governance",
		summary:
			"Formal specification narrative, lifecycle diagrams, and governance workflows for external runtimes.",
		stream: "protocol",
		stage: "planned",
		milestone: "v2.0",
		packages: ["@memofs/spec"],
		blockedBy: ["#83"],
		deliverables: [
			"Specification guides covering memory lifecycles and AgentFS session semantics",
			"Release governance linking schema bumps to architectural decisions",
		],
	},

	// =========================================================================
	// 2. Intelligence & Retrieval (Tier 2 & Tier 5)
	// =========================================================================
	{
		id: "#7",
		title: "Reciprocal Rank Fusion (RRF) Hybrid Scoring",
		summary:
			"Combine scale-incompatible vector similarity and BM25 lexical scores using standard k=60 RRF formula.",
		stream: "intelligence",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		deliverables: [
			"mergeHybridCandidates uses RRF formula instead of weighted-score blend",
			"Recency and confidence adjustments applied post-RRF",
			"Eliminates fragile arbitrary score tuning across different embedders",
		],
	},
	{
		id: "#8",
		title: "Staleness Floor with Per-Kind Expiry Windows",
		summary:
			"Inline query-time check marking aged memories as unverified based on per-kind retention windows.",
		stream: "intelligence",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		deliverables: [
			"EXPIRY_DAYS constants defined for all 7 core memory kinds",
			"Inline query-time status transition from active to unverified upon expiration",
			"GraphFactStatus extended with unverified status without requiring background daemons",
		],
	},
	{
		id: "#9",
		title: "Deterministic Diff Gate for Consolidation",
		summary:
			"Pre-critic structural filter rejecting proposals that drop critical entities, dates, or qualifiers.",
		stream: "intelligence",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		deliverables: [
			"Structural diff computation verifying preservation of entities, dates, and negation",
			"Rejects invalid drafts before LLM critic invocation to prevent hallucinated data loss",
			"Triggers auto-supersession edge creation on direct factual contradictions",
		],
	},
	{
		id: "#10",
		title: "Token Jaccard Entity Coreference Matching",
		summary:
			"Entity matching using token Jaccard similarity (≥0.6) and write-time parenthetical alias extraction.",
		stream: "intelligence",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		deliverables: [
			"Write-time extraction of aliases from parentheticals and acronyms",
			"Read-time token Jaccard similarity replacing fragile raw substring matching",
		],
	},
	{
		id: "#11",
		title: "Adaptive Baseline Recall Tier",
		summary:
			"Fast sub-millisecond lexical baseline recall skipping external vector API calls when deep search is unneeded.",
		stream: "intelligence",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		deliverables: [
			"Adaptive execution path based on configured embedders and query depth",
			"Zero-API-overhead baseline recall for rapid turn execution",
		],
	},
	{
		id: "#12",
		title: "Multi-Signal Durability Classifier",
		summary:
			"Classify memories as durable vs transient using hard validation gates and soft linguistic voting.",
		stream: "intelligence",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		deliverables: [
			"Hard gates for explicit overrides, length thresholds, and low confidence",
			"Soft voting combining memory kind, temporal deixis, and grammatical mood",
			"Escalation to LLM re-scoring only on ambiguous disagreements",
		],
	},
	{
		id: "#13",
		title: "Temporal Deixis & Syntactic Mood Signals",
		summary:
			'Linguistic cues detecting imperative commands ("fix this") vs declarative knowledge ("we use pnpm").',
		stream: "intelligence",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		blockedBy: ["#12"],
		deliverables: [
			"Temporal deixis vocabulary detecting short-lived instructions",
			"Syntactic mood parsing for first-person durable statements",
		],
	},
	{
		id: "#16",
		title: "LLM-Enhanced Retrieval Strategist",
		summary:
			"Multi-stage query rewriting, entity expansion, and candidate filtering via LLM client when available.",
		stream: "intelligence",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		blockedBy: ["#14"],
		deliverables: [
			"Query rewriting improving semantic vector and lexical recall",
			"Graceful fallback to deterministic pipeline when LLM is unavailable",
		],
	},
	{
		id: "#17",
		title: "LLM Writer-Critic Memory Consolidation",
		summary:
			"Semantic entity deduplication and contradiction resolution powered by LLM critic evaluation.",
		stream: "intelligence",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		blockedBy: ["#9", "#12", "#14"],
		deliverables: [
			"Semantic entity merge scoring across disparate memory files",
			"Cross-source supersession scoring for conflicting team decisions",
		],
	},
	{
		id: "#18",
		title: "LLM-Enhanced Staleness Re-Verification",
		summary:
			"Re-evaluate stale and unverified facts against current core memory and recent events using LLM reasoning.",
		stream: "intelligence",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		blockedBy: ["#8", "#14"],
		deliverables: [
			"LLM re-verification clearing stale status back to active when confirmed still accurate",
			"Retirement to deprecated state when confirmed obsolete",
		],
	},
	{
		id: "#36",
		title: "Promote-on-Supersession in Recall Filter",
		summary:
			"Elevate newer correcting facts above older superseded items during recall candidate filtering.",
		stream: "intelligence",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		deliverables: [
			"Filter stage checks inverse supersedes edges to prioritize newer corrections",
			"Rendered with explicit supersession lineage in retrieved context",
		],
	},
	{
		id: "#37",
		title: "validUntil Validity Windows & Query-Time Filtering",
		summary:
			"Auto-filter expired time-bounded memories at query time without requiring background worker jobs.",
		stream: "intelligence",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		blockedBy: ["#13"],
		deliverables: [
			"Parse coarse end dates from temporal deixis into validUntil metadata timestamps",
			"Query-time auto-filtering in recall store and graph search",
		],
	},

	// =========================================================================
	// 3. Security, Trust & Privacy (Tier 2 & Tier 5)
	// =========================================================================
	{
		id: "#6",
		title: "Unified Entitlement & Capability Gates",
		summary:
			"Consolidate feature capabilities into plan-agnostic boolean capabilities for runtime and CLI.",
		stream: "security",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/core", "@memofs/server"],
		deliverables: [
			"EntitlementCaps interface with hasLlmTier, canShare, hasAnalytics, hasExternalApi",
			"resolveCaps helper providing unified capability resolution across all runtimes",
		],
	},
	{
		id: "#32",
		title: "Channel Enum on WriteMemoryInput",
		summary:
			"Tag memory writes with explicit source channels (direct session, inference, tool call, connector, untrusted).",
		stream: "security",
		stage: "frontier",
		milestone: "v1.x",
		packages: ["@memofs/core", "@memofs/mcp-server", "@memofs/cli"],
		deliverables: [
			"MemoryChannel enum determining default confidence levels across all write pathways",
			"Audit trail provenance stored in note frontmatter and event logs",
		],
	},
	{
		id: "#33",
		title: "Trust Gate to Write Path",
		summary:
			"Security boundary preventing untrusted external writes from overriding verified direct session facts.",
		stream: "security",
		stage: "next-up",
		milestone: "v1.x",
		packages: ["@memofs/core"],
		blockedBy: ["#12", "#32"],
		deliverables: [
			"Suspicious external writes held in audit log but prevented from indexing into active recall",
			"Deterministic channel conflict rules protecting verified knowledge",
		],
	},
	{
		id: "#34",
		title: "Pending Verification Status for Held Records",
		summary:
			"Dedicated graph and recall status for held memory records awaiting operator or session confirmation.",
		stream: "security",
		stage: "next-up",
		milestone: "v1.x",
		packages: ["@memofs/core"],
		blockedBy: ["#33"],
		deliverables: [
			"pending_verification status added to GraphFactStatus enum",
			"Held items surfaced to operators without polluting active agent recall",
		],
	},
	{
		id: "#35",
		title: "Second-Layer PII Regex Classifier",
		summary:
			"High-precision deterministic PII filtering for emails, phones, SSNs, credit cards, and IP addresses.",
		stream: "security",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		deliverables: [
			"Deterministic PII regex pipeline in security module with Luhn validation for credit cards",
			"Two-layer validation ensuring sensitive user data is blocked from persistence",
		],
	},

	// =========================================================================
	// 4. Dev Tools & Studio (ADRs 0024-0026)
	// =========================================================================
	{
		id: "#74",
		title: "Ephemeral Agent Stream File & MCP Tools",
		summary:
			"Lightweight append-only JSONL pub/sub for transient cross-agent hints without polluting durable memory.",
		stream: "devtools",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/core", "@memofs/mcp-server"],
		deliverables: [
			"Append-only .memofs/events/stream.jsonl event log",
			"memofs.stream.publish and memofs.stream.subscribe MCP tools",
			"Path-prefix filtering preventing stream events from appearing in durable recall",
		],
	},
	{
		id: "#75",
		title: "Stream Garbage Collection on memofs doctor",
		summary:
			"Automatic TTL-based pruning of transient agent hint streams during maintenance doctor runs.",
		stream: "devtools",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/core", "@memofs/cli"],
		blockedBy: ["#74"],
		deliverables: [
			"Configurable MEMOFS_STREAM_TTL_HOURS environment variable (default 24h)",
			"memofs doctor identifies and prunes expired stream events with summary metrics",
		],
	},
	{
		id: "#76",
		title: "procedure MemoryKind & Playbook Storage CLI",
		summary:
			"Structured how-to playbooks with YAML frontmatter, step sequences, and validation CLI subcommands.",
		stream: "devtools",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/core", "@memofs/cli"],
		deliverables: [
			"procedure added as 8th MemoryKind value in core runtime",
			"PlaybookRecord storage in .memofs/playbooks/<id>.md",
			"memofs playbook write, recall, delete, and validate CLI commands",
		],
	},
	{
		id: "#77",
		title: "Strategist Procedural Playbook Injection",
		summary:
			"Auto-inject matching procedural playbooks into context briefings based on taskType and query similarity.",
		stream: "devtools",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/core"],
		blockedBy: ["#76"],
		deliverables: [
			"procedural section added to MemoryContextResult sections",
			"Jaccard token matching against playbook title and success signals (threshold >= 0.4)",
			"Concise summaries surfaced to preserve agent token budget",
		],
	},
	{
		id: "#78",
		title: "Semantic Memory Linter (memofs lint)",
		summary:
			"Static analyzer detecting contradictions and broken code anchor references in stored memory.",
		stream: "devtools",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/core", "@memofs/cli"],
		deliverables: [
			"memofs lint CLI command with --format json/text and --fail-on gates",
			"Contradiction detection rule scanning core.md and notes.md",
			"Broken-reference rule detecting deleted anchor file paths and dead links",
		],
	},
	{
		id: "#79",
		title: "Orphan-Graph & Playbook Schema Lint Rules",
		summary:
			"Extend linter to flag disconnected knowledge graph entities and structurally invalid playbooks.",
		stream: "devtools",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/core", "@memofs/cli"],
		blockedBy: ["#76", "#78"],
		deliverables: [
			"orphan-graph rule scanning nodes.jsonl for disconnected unreferenced entities",
			"playbook-schema rule verifying step actions and validator slugs",
		],
	},
	{
		id: "#80",
		title: "MemoFS Studio & Recall Simulator",
		summary:
			"Zero-dependency local web visualizer to inspect hybrid recall weights (vector, BM25, and graph).",
		stream: "devtools",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/cli"],
		deliverables: [
			"memofs studio local HTTP server using Node stdlib on localhost:3737",
			"Recall Simulator panel showing ranked results with explicit score breakdowns",
			"Read-only local file inspection with zero telemetry leaks",
		],
	},
	{
		id: "#81",
		title: "Interactive Knowledge Graph Explorer",
		summary:
			"Drag-and-drop SVG knowledge graph visualizer in Studio for exploring nodes, relationships, and decay states.",
		stream: "devtools",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/cli"],
		blockedBy: ["#80"],
		deliverables: [
			"Interactive SVG canvas for entity nodes and typed relationship edges",
			"Filter by entity kind (decision, constraint, code_symbol, procedure)",
			"Node metadata drawer showing confidence, creation time, and decay status",
		],
	},
	{
		id: "#82",
		title: "Visual Snapshot Diff & Memory Rollback",
		summary:
			"Inspect visual unified diffs between memory snapshots and selectively roll back memory branches in Studio.",
		stream: "devtools",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/cli"],
		blockedBy: ["#80"],
		deliverables: [
			"Visual side-by-side snapshot comparison viewer",
			"Safe rollback proxy delegating to audited memofs snapshot restore CLI",
		],
	},

	// =========================================================================
	// 5. Storage & Model Adapters (Tier 2 & Tier 7)
	// =========================================================================
	{
		id: "#46",
		title: "Native AWS S3 Blob Adapter",
		summary:
			"Native @memofs/adapter-s3 implementing BlobClient via AWS SDK for self-hosted S3 object storage.",
		stream: "adapters",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/adapter-s3"],
		deliverables: [
			"BlobClient implementation passing full blob contract test suite",
			"Standard AWS credential resolution and bucket configuration support",
		],
	},
	{
		id: "#47",
		title: "Native PostgreSQL Metadata Adapter",
		summary:
			"Native @memofs/adapter-postgres implementing MetadataStore and transactional concurrency via pg.",
		stream: "adapters",
		stage: "frontier",
		milestone: "v1.3.0",
		packages: ["@memofs/adapter-postgres"],
		deliverables: [
			"PostgreSQL schema migration and metadata store implementation",
			"withTransaction concurrency layer support via BEGIN/COMMIT/ROLLBACK",
		],
	},
	{
		id: "#14",
		title: "Workers AI LlmClient Adapter",
		summary:
			"Native LlmClient adapter wrapping Cloudflare Workers AI for serverless LLM text-generation and extraction.",
		stream: "adapters",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/adapter-workers-ai"],
		blockedBy: ["#6"],
		deliverables: [
			"createWorkersAiLlmClient wrapping env.AI text-generation",
			"Defensive parsing returning clean text on malformed model outputs without throwing",
		],
	},
	{
		id: "#45",
		title: "OpenAI Extractor & LlmClient Adapter",
		summary:
			"Extractor and LlmClient implementations in @memofs/adapter-openai for self-hosted OpenAI setups.",
		stream: "adapters",
		stage: "next-up",
		milestone: "v1.3.0",
		packages: ["@memofs/adapter-openai"],
		blockedBy: ["#14"],
		deliverables: [
			"OpenAI chat completions adapter for structured entity extraction and critic scoring",
			"Fetch-based Worker-safe client implementation",
		],
	},
];
