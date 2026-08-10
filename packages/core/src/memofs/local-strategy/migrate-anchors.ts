/**
 * One-shot `memofs migrate anchors` backfill logic.
 *
 * Walks `notes.md` entries and best-effort attaches `AnchorRef` metadata
 * by regex-detecting file-path references in each note's `content`.
 * Reuses the same hash-computation and path-safety seams as the write
 * path (recomputeFileHash + isSafeAnchorPath), so the anchor contract is
 * SSOT. Symbol validation via the TS Compiler API is NOT run at migration
 * time (it is per-write-time only); markers' `symbol` strings are
 * attached as-is for `.ts`/`.tsx` files without AST validation.
 *
 * `core.md` is free-form markdown with no per-entry metadata slot, so it
 * is not walked — `AnchorRef` attaches to structured note entries that
 * have a `- metadata: <json>` line.
 *
 * Idempotent: notes whose metadata already has a valid `anchor` are
 * skipped (not re-written). Re-running the command is a no-op once all
 * anchorable notes carry an anchor.
 *
 * @internal
 */

import { NOTES_MEMORY_PATH } from "../../core/constants/memory-paths";
import { normalizeMarkdownDocument } from "../../core/documents/core-memory";
import {
	appendMemoryEvent,
	createMemoryEvent,
} from "../../core/events/memory-events";
import type { Logger } from "../../core/types/logger";
import type { MemoryStore } from "../../core/types/memory-store";
import type { AnchorRef } from "../types";
import {
	isSafeAnchorPath,
	isValidAnchorRef,
	recomputeFileHash,
	resolveAnchorFilePath,
} from "./anchor-drift";
import { isTsFilePath, parseAnchorMarker } from "./anchor-marker";

/**
 * Result of a migrate-anchors run.
 *
 * @public
 */
export interface MigrateAnchorsResult {
	/** Total note entries scanned in `notes.md`. */
	scanned: number;
	/** Notes that received a newly-attached `AnchorRef`. */
	anchored: number;
	/** Notes skipped because they already had a valid `anchor` (idempotent). */
	skipped: number;
	/** Notes with no detectable file-path reference (no anchor attached). */
	noRef: number;
}

/**
 * Regex detecting repo-relative file paths in note content.
 *
 * Matches paths ending with a known source-file extension, optionally
 * preceded by directory segments and followed by `:line` or `:line-line`.
 * Root-level files (no `/`) are matched. A leading `./` is tolerated.
 * The path must NOT be preceded by another path character (avoids
 * matching substrings of URLs).
 *
 * Captured group 1 = the file path (without the `:line` suffix).
 */
const FILE_PATH_RE =
	/(?:^|[^\w/.])(\.?\/?(?:[\w.-]+\/)*[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rb|rs|java|c|cpp|cc|h|hpp|json|yaml|yml|toml|sh|md|txt|sql|graphql|proto|swift|kt|scala|php|css|scss|html|vue|svelte))(?::\d+(?:-\d+)?)?/g;

/**
 * Builds an `AnchorRef` from a file path by computing the fresh SHA-256
 * hash. Returns `undefined` when the file does not exist (cannot compute
 * a hash — `AnchorRef.hash` is required) or the path escapes the project
 * root (security gate reused from the write path).
 *
 * For `.ts`/`.tsx` files with a `symbol` argument, the symbol is
 * attached as-is (no TS Compiler validation at migration time — the
 * Compiler API is per-write-time only). Non-TS files always get
 * `symbol = undefined`.
 *
 * @internal
 */
async function buildAnchorRef(
	filePath: string,
	rootDir: string,
	symbol?: string,
): Promise<AnchorRef | undefined> {
	if (!isSafeAnchorPath(filePath, rootDir)) return undefined;
	const absolutePath = resolveAnchorFilePath(filePath, rootDir);
	const hash = await recomputeFileHash(absolutePath);
	if (hash === undefined) return undefined;
	if (symbol !== undefined && isTsFilePath(filePath)) {
		return { file: filePath, hash, symbol };
	}
	return { file: filePath, hash };
}

/**
 * Extracts the first viable `AnchorRef` from note content.
 *
 * Strategy (first match wins):
 * 1. `@anchor(file=…, symbol=…)` marker — parsed; hash computed; symbol
 *    attached as-is for `.ts`/`.tsx` (no TS Compiler validation at
 *    migration time — the spec scopes the Compiler to per-write-time).
 * 2. Regex-detected repo-relative file path — hash computed; symbol
 *    `undefined` (no prose-symbol heuristic at migration time).
 *
 * Returns `undefined` when no referenced file exists on disk.
 *
 * @internal
 */
async function detectAnchorFromContent(
	content: string,
	rootDir: string,
): Promise<AnchorRef | undefined> {
	// 1. @anchor marker.
	const marker = parseAnchorMarker(content);
	if (marker !== undefined) {
		return buildAnchorRef(marker.file, rootDir, marker.symbol);
	}

	// 2. Regex-detected file paths — first existing file wins.
	for (const match of content.matchAll(FILE_PATH_RE)) {
		const raw = match[1];
		if (raw === undefined) continue;
		const filePath = raw.replace(/^\.\//, "");
		const anchor = await buildAnchorRef(filePath, rootDir);
		if (anchor !== undefined) return anchor;
	}

	return undefined;
}

/**
 * A parsed note block from `notes.md`.
 */
interface NoteBlock {
	/** The full raw text of the block including the `## ` heading. */
	raw: string;
	/** The metadata object parsed from the `- metadata: <json>` line, if present. */
	metadata: Record<string, unknown> | undefined;
	/** The raw metadata line text (for replacement), if present. */
	metadataLine: string | undefined;
	/** The content body (everything after the frontmatter lines). */
	content: string;
}

/**
 * Parses `notes.md` into individual note blocks.
 *
 * Each block starts at a `## ` heading and ends at the next `## ` heading
 * or EOF. The `# Notes` header line is NOT a note block.
 *
 * @internal
 */
function parseNoteBlocks(notesContent: string): {
	header: string;
	blocks: NoteBlock[];
} {
	const lines = notesContent.split("\n");
	const blocks: NoteBlock[] = [];
	let header = "";
	let current: string[] | null = null;

	for (const line of lines) {
		if (line.startsWith("## ")) {
			if (current !== null) {
				blocks.push(parseBlock(current.join("\n")));
			}
			current = [line];
		} else if (current !== null) {
			current.push(line);
		} else {
			header += `${line}\n`;
		}
	}
	if (current !== null) {
		blocks.push(parseBlock(current.join("\n")));
	}

	return { header, blocks };
}

/**
 * Parses a single note block's raw text into structured fields.
 */
function parseBlock(raw: string): NoteBlock {
	const lines = raw.split("\n");
	let metadataLine: string | undefined;
	let metadata: Record<string, unknown> | undefined;

	let i = 0;
	while (i < lines.length && lines[i]?.startsWith("## ")) {
		i++;
	}
	while (i < lines.length) {
		const line = lines[i];
		if (line === undefined) break;
		if (line.startsWith("- metadata:")) {
			metadataLine = line;
			const jsonStr = line.slice("- metadata:".length).trim();
			try {
				metadata = JSON.parse(jsonStr) as Record<string, unknown>;
			} catch {
				// Malformed metadata — leave undefined.
			}
			i++;
		} else if (line.startsWith("- ")) {
			i++;
		} else {
			while (i < lines.length && lines[i] === "") i++;
			break;
		}
	}
	const content = lines.slice(i).join("\n").trim();

	return { raw, metadata, metadataLine, content };
}

/**
 * Rebuilds a note block with updated metadata.
 *
 * If the block already had a metadata line, it is replaced in-place.
 * If the block had no metadata line, one is inserted after the last
 * frontmatter line (before the blank line that precedes content).
 */
function rebuildBlock(
	block: NoteBlock,
	newMetadata: Record<string, unknown>,
): string {
	const lines = block.raw.split("\n");

	if (block.metadataLine !== undefined) {
		return lines
			.map((line) =>
				line === block.metadataLine
					? `- metadata: ${JSON.stringify(newMetadata)}`
					: line,
			)
			.join("\n");
	}

	let insertIdx = 0;
	while (insertIdx < lines.length && lines[insertIdx]?.startsWith("## ")) {
		insertIdx++;
	}
	while (insertIdx < lines.length && lines[insertIdx]?.startsWith("- ")) {
		insertIdx++;
	}

	return [
		...lines.slice(0, insertIdx),
		`- metadata: ${JSON.stringify(newMetadata)}`,
		...lines.slice(insertIdx),
	].join("\n");
}

/** Formats an unknown error as a string for logging. */
function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Walks `notes.md` entries and best-effort attaches `AnchorRef` to each
 * note's metadata by detecting file-path references in the note's
 * content. Idempotent — notes with an existing valid `anchor` are
 * skipped. Appends `memory.created` events with anchor metadata so the
 * cold-start hydration in `local-strategy.ts` picks up the new anchors
 * on the next process start.
 *
 * @param store - The memory store to read/write `notes.md` and events.
 * @param rootDir - Absolute project root for resolving repo-relative file paths.
 * @param logger - Optional logger for best-effort warnings.
 * @internal
 */
export async function migrateAnchors(
	store: MemoryStore,
	rootDir: string,
	logger?: Logger,
): Promise<MigrateAnchorsResult> {
	let notesContent: string;
	try {
		notesContent = await store.read(NOTES_MEMORY_PATH);
	} catch {
		return { scanned: 0, anchored: 0, skipped: 0, noRef: 0 };
	}

	const { header, blocks } = parseNoteBlocks(notesContent);
	if (blocks.length === 0) {
		return { scanned: 0, anchored: 0, skipped: 0, noRef: 0 };
	}

	let scanned = 0;
	let anchored = 0;
	let skipped = 0;
	let noRef = 0;
	const rebuiltBlocks: string[] = [];
	const newEvents: ReturnType<typeof createMemoryEvent>[] = [];

	for (const block of blocks) {
		scanned++;

		if (block.metadata && isValidAnchorRef(block.metadata.anchor)) {
			skipped++;
			rebuiltBlocks.push(block.raw);
			continue;
		}

		const anchor = await detectAnchorFromContent(block.content, rootDir);

		if (anchor === undefined) {
			noRef++;
			rebuiltBlocks.push(block.raw);
			continue;
		}

		const existingMeta = block.metadata ?? {};
		const newMetadata: Record<string, unknown> = {
			...existingMeta,
			anchor,
		};

		rebuiltBlocks.push(rebuildBlock(block, newMetadata));
		anchored++;

		const memId =
			typeof existingMeta.id === "string" ? existingMeta.id : undefined;
		if (memId !== undefined) {
			try {
				newEvents.push(
					createMemoryEvent({
						type: "memory.created",
						actor: { type: "system", id: "memofs/migrate" },
						summary: "Backfilled code anchor via memofs migrate anchors",
						metadata: { id: memId, anchor, migrated: true },
					}),
				);
			} catch (error) {
				logger?.warn("migrate-anchors: failed to create event (best-effort)", {
					error: formatError(error),
					memId,
				});
			}
		}
	}

	if (anchored > 0) {
		const newContent = `${header.trimEnd()}\n\n${rebuiltBlocks.join("\n\n").trimEnd()}\n`;
		await store.write(NOTES_MEMORY_PATH, normalizeMarkdownDocument(newContent));
	}

	for (const event of newEvents) {
		try {
			await appendMemoryEvent(store, event);
		} catch (error) {
			logger?.warn("migrate-anchors: failed to append event (best-effort)", {
				error: formatError(error),
			});
		}
	}

	return { scanned, anchored, skipped, noRef };
}
