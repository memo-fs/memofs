/**
 * CLI command handler for writing/remembering a note/fact to the local notes file.
 *
 * @module remember
 */

import type { Tekmemo } from "@tekmemo/core";
import {
	appendText,
	getRootDir,
	readTextIfExists,
	writeText,
} from "../cli/store-helpers";
import { CliUsageError } from "../errors/cli-errors";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { TEKMEMO_PATHS } from "../protocol/constants";
import { stringifyJsonl } from "../protocol/jsonl";
import { resolveCommandContent } from "../utils/content";
import { parseMetadataJson } from "../utils/metadata";
import { parseConfidence } from "../utils/numbers";
import { scanForSecrets } from "../utils/secrets";

/**
 * Options configuration for the remember command.
 */
export interface RememberCommandOptions {
	/**
	 * The Tekmemo client instance.
	 */
	memo: Tekmemo;
	/**
	 * The CLI output console wrapper.
	 */
	output: CliOutput;
	/**
	 * If true, outputs results in structured JSON format.
	 */
	json?: boolean | undefined;
	/**
	 * Inline text content to remember.
	 */
	content?: string | undefined;
	/**
	 * If true, reads content to remember from stdin.
	 */
	stdin?: boolean | undefined;
	/**
	 * Workspace-relative path to a file containing content to remember.
	 */
	file?: string | undefined;
	/**
	 * Prefetched stdin content, if available.
	 */
	stdinContent?: string | undefined;
	/**
	 * The type of note: decision, constraint, goal, preference, reference, summary, or note.
	 */
	kind?: string | undefined;
	/**
	 * Optional header title for the note.
	 */
	title?: string | undefined;
	/**
	 * Optional list of tags to associate with the note.
	 */
	tags?: string[] | undefined;
	/**
	 * Confidence score (0 to 1) representing the validity of the fact.
	 */
	confidence?: string | number | undefined;
	/**
	 * Optional source identifier or URI.
	 */
	source?: string | undefined;
	/**
	 * Optional actor descriptor (e.g. user, agent:id).
	 */
	actor?: string | undefined;
	/**
	 * Optional JSON string of metadata key-value pairs.
	 */
	metadata?: string | undefined;
	/**
	 * If true, ignores warnings about potential secrets or API keys in content.
	 */
	allowSecrets?: boolean | undefined;
}

/**
 * Standard list of note categories.
 */
const NOTE_KINDS = new Set([
	"decision",
	"constraint",
	"goal",
	"preference",
	"reference",
	"summary",
	"note",
]);

/**
 * Normalizes and validates the note kind input.
 *
 * @param kind - Input kind name.
 * @returns Normalized kind.
 * @throws {CliUsageError} If the kind is invalid.
 */
function normalizeKind(kind?: string): string {
	const normalized = (kind ?? "note").trim();
	if (!NOTE_KINDS.has(normalized)) {
		throw new CliUsageError(
			`Invalid memory kind "${normalized}". Allowed: ${[...NOTE_KINDS].join(", ")}`,
		);
	}
	return normalized;
}

/**
 * Parses the actor option string into structured type and optional ID.
 *
 * @param actor - Actor option string (e.g., 'agent:claude').
 * @returns Structured actor details.
 * @throws {CliUsageError} If the actor type is invalid.
 */
function parseActor(actor?: string): {
	type: "user" | "agent" | "system" | "api";
	id?: string;
} {
	if (!actor) return { type: "user" };
	const [type, id] = actor.split(":", 2);
	if (
		type !== "user" &&
		type !== "agent" &&
		type !== "system" &&
		type !== "api"
	) {
		throw new CliUsageError(
			"actor must be one of user, agent, system, or api, optionally followed by :id.",
		);
	}
	return { type, ...(id ? { id } : {}) };
}

/**
 * Formats a memory note with timestamp and metadata headers for Markdown storage.
 *
 * @param input - Note details including content and metadata.
 * @returns Formatted Markdown string.
 */
function formatTimestampedNote(input: {
	timestamp: string;
	kind: string;
	content: string;
	title?: string;
	tags?: string[];
	confidence: number;
	source?: string;
	metadata?: Record<string, unknown>;
}): string {
	const heading = input.title
		? `${input.timestamp} — ${input.title.replace(/\s+/g, " ").trim()}`
		: input.timestamp;
	const tags = input.tags?.length ? input.tags.join(", ") : "none";
	const lines = [
		`## ${heading}`,
		`- kind: ${input.kind}`,
		`- tags: ${tags}`,
		`- confidence: ${input.confidence}`,
		input.source ? `- source: ${input.source}` : undefined,
		input.metadata
			? `- metadata: ${JSON.stringify(input.metadata)}`
			: undefined,
		"",
		input.content.trim(),
		"",
	];
	return lines.filter((line): line is string => line !== undefined).join("\n");
}

/**
 * Runs the remember command, appending the new note to markdown and logging a memory event.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runRememberCommand(
	options: RememberCommandOptions,
): Promise<number> {
	const content = await resolveCommandContent({
		rootDir: getRootDir(options.memo.store),
		inline: options.content,
		stdin: options.stdin,
		file: options.file,
		stdinContent: options.stdinContent,
	});

	const findings = scanForSecrets(content);
	if (findings.length > 0 && !options.allowSecrets) {
		const data = { secretFindings: findings };
		if (options.json)
			printJsonEnvelope(options.output, "remember", { stored: false, ...data });
		else
			options.output.error(
				`Refusing to store possible secret (${findings[0]?.kind}). Use --allow-secrets only after review.`,
			);
		return 1;
	}

	const timestamp = new Date().toISOString();
	const kind = normalizeKind(options.kind);
	const tags = (options.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
	const confidence =
		typeof options.confidence === "number"
			? options.confidence
			: options.confidence
				? parseConfidence(options.confidence)
				: 1;
	const metadata = parseMetadataJson(options.metadata);
	const actor = parseActor(options.actor);

	const note = formatTimestampedNote({
		timestamp,
		kind,
		content,
		...(options.title ? { title: options.title } : {}),
		...(tags.length ? { tags } : {}),
		confidence,
		...(options.source ? { source: options.source } : {}),
		...(metadata ? { metadata } : {}),
	});

	const currentNotes = await readTextIfExists(
		options.memo.store,
		TEKMEMO_PATHS.notesMemory,
	);
	const nextNotes =
		`${(currentNotes ?? "# Notes\n").trimEnd()}\n\n${note}`.trimStart();
	await writeText(
		options.memo.store,
		TEKMEMO_PATHS.notesMemory,
		`${nextNotes.trimEnd()}\n`,
	);

	const eventId = `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
	const event = {
		id: eventId,
		type: "memory.created",
		timestamp,
		sourcePath: TEKMEMO_PATHS.notesMemory,
		actor,
		summary:
			options.title ??
			content.split(/\r?\n/)[0]?.slice(0, 140) ??
			"Stored memory note",
		metadata: {
			kind,
			tags,
			confidence,
			...(options.source ? { source: options.source } : {}),
			...(metadata ? { userMetadata: metadata } : {}),
			createdBy: "tekmemo/cli",
		},
	};
	await appendText(
		options.memo.store,
		TEKMEMO_PATHS.memoryEvents,
		stringifyJsonl([event]),
	);

	const data = {
		stored: true,
		eventId,
		path: TEKMEMO_PATHS.notesMemory,
		kind,
		tags,
		confidence,
		secretFindings: findings,
	};
	if (options.json) printJsonEnvelope(options.output, "remember", data);
	else
		options.output.success(
			`Stored ${kind} memory in ${TEKMEMO_PATHS.notesMemory}`,
		);
	return 0;
}
