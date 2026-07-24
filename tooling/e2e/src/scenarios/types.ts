/**
 * Common types for deterministic e2e scenarios (ticket 65).
 *
 * @remarks
 * Each scenario proves:
 * - File-First Truth: `.memofs/` layout exists on disk after run
 * - Cross-Visibility: fact written via one surface visible to others same tmpDir
 * - Contract Superset: real impls still satisfy contract tests
 * - Golden Snapshot: file list + content hash deterministic
 *
 * @public
 */

/**
 * Snapshot of filesystem after scenario run.
 * @public
 */
export type ScenarioFsSnapshot = {
	/** Sorted list of relative paths under tmpDir */
	files: string[];
	/** Map relative path → content (utf8) for all files */
	contents: Record<string, string>;
	/** Content hashes (simple deterministic hash based on length + prefix, not cryptographic for speed, but stable) */
	hashes: Record<string, string>;
	/** Total file count */
	fileCount: number;
};

/**
 * Cross-visibility proof object.
 * @public
 */
export type CrossVisibilityProof = {
	/** CLI remember visible to core recall */
	cliToCore: boolean;
	/** Core remember visible to CLI context */
	coreToCli: boolean;
	/** CLI remember visible to MCP recall */
	cliToMcp?: boolean;
	/** Core remember visible to connector harness search */
	coreToConnector?: boolean;
};

/**
 * File-first truth assertions.
 * @public
 */
export type FileFirstTruthProof = {
	/** .memofs/ exists */
	hasMemofsDir: boolean;
	/** .memofs/manifest.json exists */
	hasManifest: boolean;
	/** .memofs/memory-events.jsonl exists */
	hasMemoryEvents: boolean;
	/** .memofs/memory/*.md or equivalent exists */
	hasMemoryFiles: boolean;
	/** At least one file under .memofs/ */
	fileCountGreaterThanZero: boolean;
};

/**
 * Known scenario names.
 * @public
 */
export type ScenarioName =
	| "lifecycle"
	| "agentfs-interleaved"
	| "connectors-merge"
	| "failure-recovery"
	| "golden-snapshots"
	| "seeded-loop"
	| "orchestrator"
	| "simulation";

/**
 * Result returned by each scenario runner.
 * @public
 */
export type ScenarioResult = {
	/** Name of scenario (lifecycle, agentfs-interleaved, etc.) */
	scenario: ScenarioName;
	/** tmpDir used (may have been cleaned after, but path recorded) */
	tmpDir: string;
	/** Whether scenario passed its internal assertions */
	passed: boolean;
	/** File-first truth proof */
	fileFirstTruth: FileFirstTruthProof;
	/** Cross-visibility proof (when applicable) */
	crossVisibility?: CrossVisibilityProof;
	/** FS snapshot after scenario */
	snapshot: ScenarioFsSnapshot;
	/** Additional free-form assertions/messages */
	details: Record<string, unknown>;
};

/**
 * Options common to scenario runners.
 * @public
 */
export type ScenarioOptions = {
	/** Reuse existing tmpDir (for orchestrator composition). If not provided, creates new. */
	tmpDir?: string;
	/** Prefix for mkdtemp if creating new dir */
	prefix?: string;
	/** Project ID for MemoFS */
	projectId?: string;
	/** Whether to keep tmpDir after run (for golden snapshot debugging). Default false (cleanup). */
	keepTmpDir?: boolean;
};

/**
 * Helper to compute simple deterministic hash for content.
 * Uses length + first 64 chars normalized + simple char sum — fast, deterministic, no crypto dep.
 * @param content - file content
 * @returns hash string
 * @public
 */
export function computeSimpleHash(content: string): string {
	let sum = 0;
	for (let i = 0; i < content.length; i++) {
		sum = (sum + content.charCodeAt(i)) % 1_000_000_007;
	}
	const prefix = content.slice(0, 64).replace(/\s+/g, " ").trim();
	return `${content.length}:${sum}:${prefix.slice(0, 32)}`;
}

/**
 * Build ScenarioFsSnapshot from raw file list + contents.
 * @param files - sorted relative file list
 * @param contents - map path → content
 * @returns snapshot
 * @public
 */
export function buildFsSnapshot(
	files: string[],
	contents: Record<string, string>,
): ScenarioFsSnapshot {
	const hashes: Record<string, string> = {};
	for (const f of files) {
		const content = contents[f] ?? "";
		hashes[f] = computeSimpleHash(content);
	}
	return {
		files: [...files].sort(),
		contents,
		hashes,
		fileCount: files.length,
	};
}
