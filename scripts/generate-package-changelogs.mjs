#!/usr/bin/env node

/**
 * generate-package-changelogs.mjs
 *
 * Generates per-package CHANGELOG.md files in each package directory under packages/.
 * Each CHANGELOG.md includes:
 *  1. An `## Unreleased` section populated with pending changes from active changesets.
 *  2. Full release history from the initial release (v1.0.0-beta.2) through v1.3.0-beta.3.
 *
 * The format matches Changesets conventions so future `changeset version` runs will
 * prepend/append seamlessly.
 *
 * Usage:
 *   node scripts/generate-package-changelogs.mjs
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");

// Map of package-dir -> package name
function getPackages() {
	const map = new Map();
	for (const dir of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue;
		const pkgPath = join(PACKAGES_DIR, dir.name, "package.json");
		if (existsSync(pkgPath)) {
			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
			map.set(dir.name, pkg.name);
		}
	}
	return map;
}

// ── UNRELEASED ENTRIES ───────────────────────────────────────────────────────
const UNRELEASED = {
	core: {
		minor: [
			"Fused the hybrid recall merge: lexical and vector candidate sets now join by memory id, so a memory surfaced by both retrieval paths scores as one candidate with a gated double-hit bonus (`0.6·v + 0.4·l + 0.25·min(v,l)`, clamped to 1) instead of two half-scored siblings. Single-path hits pass through with the dynamic weight collapse to a full-weight single path.",
			"Consolidated reranker input to one candidate per memory (best-chunk evidence), so a memory chunked into N pieces gets exactly one recall list entry carrying the strongest chunk's text and merged metadata.",
			"Added `HYBRID_SCORING_DEFAULTS` and `HYBRID_SINGLE_PATH_WEIGHTS` as frozen, named single-source-of-truth constants for every tuning literal in the scoring path.",
			"Added a one-time maintenance scrub on first hydration: embedding rows whose `sourceId` predates recall-document identity unification (write timestamps instead of memory ids) are dropped once, recorded via the new optional `maintenance.legacyEmbeddingsScrubbedAt` manifest timestamp so the pass never repeats. The scrub is bounded to `note`-source rows, never touches connector or document indexes, and fails closed (no-op, flag unset) when no memory ids could be hydrated.",
			"Added optional, feature-detected `listDocuments()` to the `RecallStore` port (implemented by the in-memory and file-backed stores) to enumerate embedding rows without loading embeddings.",
			"Switched the default local embedding model from `Xenova/all-MiniLM-L6-v2` to `Xenova/bge-small-en-v1.5` (same 384 dimensions, stronger retrieval quality). The default now lives in one exported constant — `DEFAULT_LOCAL_EMBEDDING_MODEL` on `@memofs/core` — shared by the lazy local embedder, resolved config, and the Transformers.js adapter so the three default sites cannot drift.",
			'Added asymmetric instruction-prefix support for instruction-tuned model families. `EmbedTextsInput` gains `purpose: "query" | "document"` and `MemoryEmbedder` gains an optional `embedQuery()`; the adapter applies the model family\'s prefixes automatically (`bge` queries get `Represent this sentence for searching relevant passages: `, `e5` gets `query:`/`passage:`, `nomic` gets `search_query:`/`search_document:`). Symmetric models (`all-MiniLM`, `gte`) are unchanged, and returned records always carry the caller\'s original text. Hybrid recall now embeds queries through `embedQuery` when the embedder provides it.',
			"Added a cross-model vector guard: chunks are stamped with their producing model in `metadata.model` at index time, and vector queries filter to chunks from the same model as the query embedder. Vectors from different models live in incomparable spaces, so chunks embedded by a previous default model (or unstamped legacy rows) drop out of the vector path instead of polluting scores — lexical (BM25) recall still surfaces them until they are re-written.",
		],
		patch: [],
	},
	cli: {
		minor: [
			"`.memofs/connectors.json` now has a JSON schema, shipped with the CLI at `schema/connectors.json` and exposed via the `@memofs/cli/schema/connectors.json` package export. It mirrors the runtime validator's contract: required `id`/`type`/`secretRef`, optional `enabled`/`schedule`/`sourceMapping`, and no additional properties — so token-shaped fields and typos are flagged in the editor before they ever reach the runtime guardrails.",
			"`memofs connectors add` and `memofs connectors remove` stamp a `$schema` reference into the file on every write, giving editors validation and autocomplete the same way `config.json` already gets them. The reference prefers the portable `../node_modules/@memofs/cli/schema/connectors.json` path when the CLI package is installed under the project root, and falls back to the hosted copy at `https://docs.memofs.dev/schema/connectors.json` otherwise.",
			"`memofs init` now predownloads the local embedding model into the shared cache, so the weights are already on disk by the time an agent connects to the MCP server (previously the download started at MCP server boot). The predownload resolves `@memofs/adapter-transformers` from the project's own `node_modules` — where `@memofs/mcp-server` installs it — without the CLI taking a hard dependency on the adapter. Pass `--no-embeddings` (or set `MEMOFS_SKIP_MODEL_DOWNLOAD=1`) to skip it; `--json` mode reports the outcome as a structured `embeddings` field instead of progress output.",
			'`memofs init` (and `memofs config init`) now write `recall: { engine: "auto", localEmbeddings: true }` into `.memofs/config.json` explicitly. This unifies the local-mode default in the file, and matches the init-time predownload so hybrid recall is on before the MCP server connects.',
		],
		patch: [
			"Updated the CLI config JSON schema description and documentation to reflect the new default local embedding model (`Xenova/bge-small-en-v1.5`) and q8 weights.",
		],
	},
	"adapter-transformers": {
		minor: [
			"Switched the default local embedding model from `Xenova/all-MiniLM-L6-v2` to `Xenova/bge-small-en-v1.5` (same 384 dimensions, stronger retrieval quality).",
			"Switched the adapter's default ONNX `dtype` from `fp32` to `q8`: the first-run model download drops from ~86 MB to ~32 MB with faster CPU inference and negligible retrieval-quality loss. `fp32` remains available via the `dtype` option.",
			"Added asymmetric instruction-prefix support for instruction-tuned model families (`bge`, `e5`, `nomic`).",
			"Model weights now live in one shared user-level cache — `$XDG_CACHE_HOME/memofs/models`, falling back to `~/.cache/memofs/models` — resolved by the adapter automatically via the new exported `resolveModelCacheDir()`. One download per machine, shared across projects and runtimes.",
		],
		patch: [],
	},
};

// ── HISTORICAL RELEASES ─────────────────────────────────────────────────────

const INITIAL_RELEASE_DETAILS = {
	core: [
		"A file-first memory runtime — memory lives in your local workspace as the source of truth, not a database.",
		"A virtual filesystem for project memory, with separate working and output areas.",
		"A hybrid recall pipeline combining keyword, fuzzy, and vector search with pluggable embedders and rerankers.",
		"Durable graph memory with nodes, edges, versioned snapshots, and conflict-free writes.",
		"Support for pluggable embedders, rerankers, recall stores, extractors, and LLM clients.",
		"A local filesystem-backed memory store for production use, and an in-memory store for testing.",
	],
	cli: [
		"A command to initialize a local memory workspace (`memofs init`).",
		"A command to save durable decisions, constraints, goals, and preferences (`memofs remember`).",
		"A command to run hybrid semantic and keyword search over memory (`memofs recall`).",
		"A command to build task-ready context from core memory, recall results, and recent notes (`memofs context`).",
		"A command to inspect current memory state (`memofs status`).",
		"A command to consolidate memory — merging duplicates and retiring outdated facts (`memofs consolidate`).",
		"A command to sync workspace files with MemoFS Cloud (`memofs sync`).",
	],
	"mcp-server": [
		"Four memory tools: `context`, `recall`, `remember`, and `consolidate`.",
		"Six session tools for starting, reading, writing, appending, extracting, and completing agent sessions.",
		"Nine resources covering health, context, core memory, notes, recent memory, and graph nodes and edges.",
		"Configurable via runtime flags or environment variables, with a read-only mode.",
	],
	server: [
		"A self-hostable, provider-neutral memory server, available as a Node binary or a Cloudflare Worker.",
		"Deterministic defaults for every component — keyword-only recall, token-overlap reranking, rule-based extraction — with zero external API keys required.",
		"Bearer-token authentication.",
		"JSON-RPC 2.0 over HTTP.",
	],
	connectors: [
		"A local ingestion framework for external sources like GitHub and Notion.",
		"Secure token handling with env, keychain, and file secret resolvers.",
		"Deduplication and stable source references for imported content.",
	],
	"json-rpc": [
		"A dependency-free JSON-RPC 2.0 protocol implementation with request/response/notification framing and error formatting.",
	],
	testing: [
		"A testing package with contract test suites, in-memory fakes, and verification fixtures for storage, embedder, and reranker adapter authors.",
	],
	"benchmark-kit": [
		"A benchmarking kit with reproducible retrieval workloads, statistical analysis, threshold assertions, and markdown reporting.",
	],
	"adapter-ai-sdk": [
		"A Vercel AI SDK bridge with tool definitions, context injection builders, and stream handlers.",
	],
	"adapter-openai": [
		"OpenAI embeddings adapter supporting `text-embedding-3-small`, `text-embedding-3-large`, and `text-embedding-ada-002`.",
	],
	"adapter-voyage": [
		"Voyage AI adapter supporting `voyage-3`, `voyage-3-lite`, `voyage-code-3`, and reranker models.",
	],
	"adapter-transformers": [
		"Local embeddings adapter via Transformers.js (ONNX runtime) — zero API key or external cloud service required.",
	],
	"adapter-r2": [
		"Cloudflare R2 object storage adapter for remote memory storage and sync.",
	],
	"adapter-turso": [
		"Turso and libSQL database adapter for remote metadata and graph storage.",
	],
	"adapter-workers-ai": [
		"Cloudflare Workers AI adapter for serverless embedding generation and entity extraction.",
	],
};

const RELEASES = [
	{
		version: "1.3.0-beta.3",
		date: "August 17, 2026",
		packages: {
			"mcp-server": {
				minor: [
					"Added official Model Context Protocol Registry manifest metadata (`server.json`) for automated ecosystem discovery and subregistry indexing.",
					'Added `"mcpName": "dev.memofs/mcp-server"` package ownership verification property.',
					"Added multi-transport support documenting local stdio execution with environment variables (`MEMOFS_API_KEY`, `MEMOFS_RUNTIME`) and hosted Streamable HTTP remote endpoints.",
				],
			},
		},
	},
	{
		version: "1.3.0-beta.2",
		date: "August 16, 2026",
		packages: {
			core: {
				minor: [
					"Added `id?: string` as a first-class typed property on `TimestampedNote` and `ConversationEntry` document interfaces.",
					"Added frontmatter and metadata normalization and serialization support for note identifiers in `normalizeTimestampedNote` and `formatTimestampedNote`.",
					"Added `idempotencyKey?: string` to `WriteMemoryInput` with runtime deduplication in `writeMemory()`, returning `{ created: false }` without redundant appends to `notes.md` or `memory-events.jsonl` when duplicate keys or existing IDs are provided.",
					"Added orthogonal status dimensions (`disputed?: boolean`, `stale?: boolean`, `unverified?: boolean`) to `GraphNode`, `GraphEdge`, `GraphNodeInput`, and `GraphEdgeInput` to prevent semantic collisions across temporal deprecation, dispute, code drift, and time decay.",
					'Updated `markConflictingEdges()` to set `disputed: true` alongside `status: "conflicted"`.',
				],
			},
		},
	},
	{
		version: "1.3.0-beta.1",
		date: "August 13, 2026",
		packages: {
			core: {
				minor: [
					"Added anchor reference support with file paths, hashes, and optional symbols to memory write inputs and prose content via anchor markers.",
					"Added write-time symbol path extraction for TypeScript files using the TypeScript Compiler API with path traversal security validation.",
					"Added query-time drift detection inside memory recall and context building. Memories with modified or deleted target files transition to stale status, receive a stale flag on recall items, and get demoted in search relevance with a half score multiplier.",
					"Added manifest hash caching with modification time invalidation and persistence for cross-session drift checks.",
					"Added kind-specific decay floors for all seven memory kinds ranging from 30 days for notes to 365 days for decisions.",
					"Added unverified status for graph facts. Active memories exceeding their decay floor transition to unverified status, set an unverified metadata flag on recall items, and receive a score demotion while remaining accessible for re-verification.",
					"Added outcome parameters indicating success, failure, or aborted status, ephemeral cleanup flags, and failure reason inputs to session completion functions.",
					"Implemented a five-row outcome matrix that gates durable memory promotion on successful outcome and durable memory extraction, while governing working and output directory cleanup.",
					"Added support for session resumption across aborted completions by preserving workspace state.",
					"Added session failure audit event logging with failure reason telemetry.",
				],
			},
			cli: {
				minor: [
					"Added a CLI command (`memofs migrate anchors`) to backfill anchor metadata onto existing structured note entries by parsing file and symbol references.",
					"Added a CLI command option (`memofs consolidate --archive-deprecated`) to move deprecated memory entries into cold storage archive files and remove them from active recall indexes.",
					"Added a CLI command (`memofs restore <id>`) to restore archived memory records back to active memory files and reactivate their graph node status.",
					"Added archived and restored audit event logging to memory events.",
					"Added a fix option (`--fix`) to the doctor command to automatically consolidate memory graph nodes and move deprecated memory entries into cold storage archive files.",
					"Added a diagnostic check to the doctor command that warns when deprecated memory entries are pending archive.",
					"Strengthened generated agent rules files so the MemoFS memory workflow is binding rather than advisory, adding strict requirement headings, forbidding unverified assumptions, and adding task completion memory checks.",
					"Generating agent rules targets now emits only the primary instructions file, while umbrella agent generation commands produce local workspace rules directories and git conventions files.",
					"Generating Claude agent rules emits a single import reference when a root agents rules file already exists, maintaining a single source of truth without duplicating content.",
					"Added advisory warnings to the workspace doctor command when core memory exceeds 200 lines to match instruction file soft limits.",
					"Removed the pointers section from the generated agent rules template to streamline configuration.",
					"Removed the hard limit and validation errors for maximum agent rules line counts, replacing it with soft line advisories on core memory.",
				],
				patch: [
					"Fixed Claude Code and Codex session hooks from failing silently when the CLI is not installed globally by adding automatic fallback execution.",
					"Applied local execution fallback to generated opencode plugin events to ensure compliance markers and status notifications display properly.",
				],
			},
			"mcp-server": {
				minor: [
					"Added optional anchor parameters to memory write tool definitions and stale indicators to recall tool output.",
					"Added outcome, ephemeral cleanup, and failure reason parameters to the agent session completion tool.",
				],
			},
		},
	},
	{
		version: "1.2.0-beta.3",
		date: "August 6, 2026",
		packages: {
			"adapter-ai-sdk": {
				patch: [
					"Refactored the Vercel AI SDK tool input schema to a root object format, fixing tool-calling compatibility with OpenAI, Anthropic, and Google Gemini models.",
					"Exposed both `parameters` and `inputSchema` fields on the memory tool definition for full compatibility across Vercel AI SDK versions.",
				],
			},
			cli: {
				minor: [
					"Added zero-dependency TTY step spinners and itemized progress bars for long-running cloud sync operations.",
					"Added animated progress feedback during workspace integrity diagnostics and external connector runs.",
					"Added SIGINT and SIGTERM terminal signal handlers to gracefully restore cursor visibility and handle cancellation.",
					"Added automatic visual animation suppression when output is piped, NO_COLOR is set, or JSON mode is active.",
				],
			},
		},
	},
	{
		version: "1.2.0-beta.2",
		date: "July 26, 2026",
		packages: {
			core: {
				patch: [
					"Improved project ID resolution so local workspace operations automatically fall back to the project manifest when omitted in configuration or flags.",
				],
			},
			cli: {
				minor: [
					"Added short flag `-p` support for global project ID selection across all cloud and sync subcommands.",
				],
				patch: [
					"Fixed an issue during cloud sync pulls where mandatory pre-sync snapshots were skipped prior to overwriting local workspace files.",
					"Fixed cloud sync push to properly forward explicit base cursor values when confirming upload completion.",
				],
			},
		},
	},
	{
		version: "1.2.0-beta.1",
		date: "July 25, 2026",
		packages: {
			core: {
				minor: [
					"Reduced memory growth during long-running sessions by capping internal caches.",
					"Improved consistency between search and ranking so results match more reliably.",
					"Improved search relevance for headings made up of multiple words.",
					"Improved recall so results aren't held back when only one search method (keyword or vector) finds matches.",
					"Improved reliability of context building across more JavaScript runtimes, including web workers.",
					"Added optional logging for background operations like indexing and graph updates, to make debugging easier.",
					"The recall pipeline now automatically resolves the appropriate recall store without requiring manual configuration.",
				],
				patch: [
					"Fixed a rare bug where two memory graph nodes could collide and silently overwrite each other.",
					"Fixed a rare bug where two snapshots created in quick succession could end up with the same ID.",
					"Fixed an issue where a failed write could leave the memory graph in a partially updated state instead of rolling back cleanly.",
					"Fixed a file-locking bug on macOS that could stall under heavy load.",
					"Fixed entity matching so short terms like `db` no longer incorrectly match unrelated longer words.",
					"Fixed an issue where combining results from different memory sources could drop metadata.",
				],
			},
			cli: {
				minor: [
					"Optimized runtime configuration and commander option handling for lower startup overhead.",
				],
				patch: [
					"Fixed an incorrect default schema URL in generated configuration files.",
				],
			},
			"mcp-server": {
				minor: [
					"Non-blocking HuggingFace model prewarming on server startup when `localEmbeddings` is enabled, eliminating cold-start latency on the first memory tool call.",
					"Progress updates output to `stderr` during initial model weight downloads (`[memofs] Downloading local embedding model weights...`).",
					"Increased default per-tool request timeout from 30s to 60s to prevent false timeout failures during first-time weight downloads on slower connections.",
				],
			},
			connectors: {
				minor: [
					"GitHub Discussions connector now maps the discussion category as a label on the resulting note.",
				],
			},
		},
	},
	{
		version: "1.1.0-beta.1",
		date: "July 21, 2026",
		packages: {
			core: {
				minor: [
					"Improved compatibility so core hashing now works in more JavaScript environments, including web workers.",
				],
				patch: [
					"Fixed an issue where restarting could cause previously saved memory and graph data to appear lost.",
					"Fixed file-locking bugs that could cause conflicts between concurrent sessions.",
					"Fixed a bug where missing remote data could silently corrupt a saved record instead of raising an error.",
					"Fixed an issue where a failed memory write could be incorrectly reported as successful.",
				],
			},
			cli: {
				minor: [
					"Session hooks for Claude Code, Codex, Cursor, and opencode that automatically load memory context at the start of a session, refresh it after long-conversation compaction, and summarize memory usage when a session ends.",
					"A compliance summary showing whether an agent loaded context, consulted memory, and saved new information during a session.",
					"Task-aware memory retrieval, so agents get more relevant results based on the kind of work they're doing.",
					"Support for opencode across all agent generation commands.",
					"Workspace initialization now also generates a schema reference for editor validation and autocomplete.",
					"Config schema references now resolve from your installed CLI version instead of a versioned docs URL, so they can't drift out of sync.",
					"Generated agent instructions now include clearer workspace rules and links to project conventions.",
				],
				patch: [
					"Fixed an issue in Cloud sync where file manifests could be generated incorrectly.",
				],
			},
			connectors: {
				minor: [
					"Unified timeout and retry handling across the built-in GitHub and Notion connectors for more consistent behavior.",
					"Simplified shared formatting logic between the GitHub and Notion connectors.",
				],
				patch: [
					"Fixed a bug in connector duplicate-detection that could cause repeated notes to be created on re-runs.",
				],
			},
		},
	},
	{
		version: "1.0.0-beta.2",
		date: "July 10, 2026",
		packages: {}, // Populated with INITIAL_RELEASE_DETAILS
	},
];

function buildPackageChangelog(pkgDir, pkgName) {
	const lines = [`# ${pkgName}`, ""];

	// 1. Unreleased Section
	lines.push("## Unreleased", "");
	const unreleased = UNRELEASED[pkgDir];
	if (
		unreleased &&
		((unreleased.minor && unreleased.minor.length > 0) ||
			(unreleased.patch && unreleased.patch.length > 0))
	) {
		if (unreleased.minor && unreleased.minor.length > 0) {
			lines.push("### Minor Changes", "");
			for (const item of unreleased.minor) {
				lines.push(`- ${item}`);
			}
			lines.push("");
		}
		if (unreleased.patch && unreleased.patch.length > 0) {
			lines.push("### Patch Changes", "");
			for (const item of unreleased.patch) {
				lines.push(`- ${item}`);
			}
			lines.push("");
		}
	} else if (pkgDir === "spec") {
		lines.push("### Added", "");
		lines.push("- Initial manifest schema and structural validator.", "");
		lines.push("### Schema governance", "");
		lines.push(
			"- Schemas are generated from the MemoFS TypeScript source types.",
		);
		lines.push(
			"- AJV is the package's only runtime dependency. Zod remains in the core runtime, so consumers opt into JSON Schema validation only when they install this package.",
		);
		lines.push(
			"- Quicktype was evaluated as an alternative generator. The TypeScript JSON Schema generator was selected because it derives directly from the source interfaces used by the runtime.",
		);
		lines.push(
			"- When an on-disk shape changes, update its approved design record, regenerate the schema, bump this package, and add a changelog entry.",
			"",
		);
	} else {
		lines.push("*No changes yet.*", "");
	}

	// 2. Historical Releases
	for (const rel of RELEASES) {
		lines.push(`## ${rel.version}`, "");

		if (rel.version === "1.0.0-beta.2") {
			const initialItems = INITIAL_RELEASE_DETAILS[pkgDir] || [
				"Initial public release as part of MemoFS.",
			];
			lines.push("### Minor Changes", "");
			for (const item of initialItems) {
				lines.push(`- ${item}`);
			}
			lines.push("");
			continue;
		}

		const pkgChanges = rel.packages[pkgDir];
		if (
			pkgChanges &&
			((pkgChanges.minor && pkgChanges.minor.length > 0) ||
				(pkgChanges.patch && pkgChanges.patch.length > 0))
		) {
			if (pkgChanges.minor && pkgChanges.minor.length > 0) {
				lines.push("### Minor Changes", "");
				for (const item of pkgChanges.minor) {
					lines.push(`- ${item}`);
				}
				lines.push("");
			}
			if (pkgChanges.patch && pkgChanges.patch.length > 0) {
				lines.push("### Patch Changes", "");
				for (const item of pkgChanges.patch) {
					lines.push(`- ${item}`);
				}
				lines.push("");
			}
		} else {
			lines.push("### Patch Changes", "");
			lines.push("- Updated internal dependencies.", "");
		}
	}

	return `${lines.join("\n").trim()}\n`;
}

function main() {
	console.log("📝 Generating per-package CHANGELOGs for all packages...\n");
	const packages = getPackages();

	let count = 0;
	for (const [dir, name] of packages) {
		const changelog = buildPackageChangelog(dir, name);
		const outPath = join(PACKAGES_DIR, dir, "CHANGELOG.md");
		writeFileSync(outPath, changelog, "utf-8");
		console.log(`  ✅ ${name} -> packages/${dir}/CHANGELOG.md`);
		count++;
	}

	console.log(
		`\n🏁 Done. Generated ${count} comprehensive CHANGELOG.md files.`,
	);
}

main();
