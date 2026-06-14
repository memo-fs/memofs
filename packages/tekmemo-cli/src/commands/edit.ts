import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { TEKMEMO_PATHS } from "../protocol/constants";
import { stringifyJsonl } from "../protocol/jsonl";
import { scanForSecrets } from "../utils/secrets";

export interface EditCommandOptions {
	fs: TekMemoFileSystem;
	output: CliOutput;
	json?: boolean | undefined;
	type: "note" | "core";
	message: string;
	allowSecrets?: boolean | undefined;
}

export async function runEditCommand(
	options: EditCommandOptions,
): Promise<number> {
	const findings = scanForSecrets(options.message);
	if (findings.length > 0 && !options.allowSecrets) {
		if (options.json)
			printJsonEnvelope(options.output, "edit", {
				updated: false,
				secretFindings: findings,
			});
		else
			options.output.error(
				`Refusing to store possible secret (${findings[0]?.kind}). Use --allow-secrets only after review.`,
			);
		return 1;
	}

	const file =
		options.type === "core"
			? TEKMEMO_PATHS.coreMemory
			: TEKMEMO_PATHS.notesMemory;
	const timestamp = new Date().toISOString();
	const entry =
		options.type === "note"
			? `\n## ${timestamp}\n- kind: note\n- tags: none\n- confidence: 1\n\n${options.message.trim()}\n`
			: `\n${options.message.trim()}\n`;
	await options.fs.appendText(file, entry);

	const event = {
		id: `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`,
		type: "memory.updated",
		timestamp,
		sourcePath: file,
		actor: { type: "user" },
		summary: `${options.type} memory updated by CLI`,
		metadata: {
			document: options.type,
			command: "edit",
			createdBy: "@tekbreed/tekmemo/cli",
		},
	};
	await options.fs.appendText(
		TEKMEMO_PATHS.memoryEvents,
		stringifyJsonl([event]),
	);

	const data = {
		updated: true,
		path: file,
		eventId: event.id,
		secretFindings: findings,
	};
	if (options.json) printJsonEnvelope(options.output, "edit", data);
	else options.output.success(`Updated ${file}`);
	return 0;
}
