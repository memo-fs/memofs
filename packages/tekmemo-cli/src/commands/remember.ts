import { CliUsageError } from "../errors/cli-errors";
import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { TEKMEMO_PATHS } from "../protocol/constants";
import { stringifyJsonl } from "../protocol/jsonl";
import { resolveCommandContent } from "../utils/content";
import { parseMetadataJson } from "../utils/metadata";
import { parseConfidence } from "../utils/numbers";
import { scanForSecrets } from "../utils/secrets";

export interface RememberCommandOptions {
	fs: TekMemoFileSystem;
	output: CliOutput;
	json?: boolean | undefined;
	content?: string | undefined;
	stdin?: boolean | undefined;
	file?: string | undefined;
	stdinContent?: string | undefined;
	kind?: string | undefined;
	title?: string | undefined;
	tags?: string[] | undefined;
	confidence?: string | number | undefined;
	source?: string | undefined;
	actor?: string | undefined;
	metadata?: string | undefined;
	allowSecrets?: boolean | undefined;
}

const NOTE_KINDS = new Set([
	"decision",
	"constraint",
	"goal",
	"preference",
	"reference",
	"summary",
	"note",
]);

function normalizeKind(kind?: string): string {
	const normalized = (kind ?? "note").trim();
	if (!NOTE_KINDS.has(normalized)) {
		throw new CliUsageError(
			`Invalid memory kind "${normalized}". Allowed: ${[...NOTE_KINDS].join(", ")}`,
		);
	}
	return normalized;
}

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

export async function runRememberCommand(
	options: RememberCommandOptions,
): Promise<number> {
	const content = await resolveCommandContent({
		rootDir: options.fs.rootDir,
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

	const currentNotes = await options.fs.readTextIfExists(
		TEKMEMO_PATHS.notesMemory,
	);
	const nextNotes =
		`${(currentNotes ?? "# Notes\n").trimEnd()}\n\n${note}`.trimStart();
	await options.fs.writeText(
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
			createdBy: "@tekbreed/tekmemo/cli",
		},
	};
	await options.fs.appendText(
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
