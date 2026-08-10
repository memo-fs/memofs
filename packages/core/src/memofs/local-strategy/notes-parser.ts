/**
 * Shared `notes.md` block parser.
 *
 * Parses `notes.md` into individual note blocks (each starting at a
 * `## ` heading) with their metadata line (`- metadata: <json>`)
 * extracted. Used by both the `memofs migrate anchors` backfill and
 * the `memofs consolidate --archive-deprecated` archive move so the
 * parsing contract stays in one place.
 *
 * @internal
 */

/**
 * A parsed note block from `notes.md`.
 *
 * @internal
 */
export interface NoteBlock {
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
 * Result of parsing `notes.md` into header text + note blocks.
 *
 * @internal
 */
export interface ParsedNotes {
	/** Everything before the first `## ` heading (the `# Notes` header + blank lines). */
	header: string;
	/** Individual note blocks. */
	blocks: NoteBlock[];
}

/**
 * Parses `notes.md` into individual note blocks.
 *
 * Each block starts at a `## ` heading and ends at the next `## ` heading
 * or EOF. The `# Notes` header line is NOT a note block.
 *
 * @internal
 */
export function parseNoteBlocks(notesContent: string): ParsedNotes {
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
 *
 * @internal
 */
export function parseBlock(raw: string): NoteBlock {
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
 *
 * @internal
 */
export function rebuildBlock(
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
