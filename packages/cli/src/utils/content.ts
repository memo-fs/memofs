import fs from "node:fs/promises";
import { CliUsageError } from "../errors/cli-errors";
import { resolveInsideRoot } from "../fs/paths";

export interface ResolveContentInput {
	rootDir: string;
	inline?: string | undefined;
	stdin?: boolean | undefined;
	file?: string | undefined;
	stdinContent?: string | undefined;
}

export async function resolveCommandContent(
	input: ResolveContentInput,
): Promise<string> {
	const sources = [
		input.inline !== undefined,
		input.stdin === true,
		input.file !== undefined,
	].filter(Boolean).length;

	if (sources === 0) {
		throw new CliUsageError(
			"Provide content as an argument, --stdin, or --file <path>.",
		);
	}
	if (sources > 1) {
		throw new CliUsageError(
			"Use only one content source: argument, --stdin, or --file.",
		);
	}

	let content: string;
	if (input.inline !== undefined) {
		content = input.inline;
	} else if (input.file !== undefined) {
		const path = resolveInsideRoot(input.rootDir, input.file);
		content = await fs.readFile(path, "utf8");
	} else {
		content = input.stdinContent ?? (await readStdin());
	}

	if (content.includes("\0"))
		throw new CliUsageError("Content must not contain null bytes.");
	if (content.trim().length === 0)
		throw new CliUsageError("Content must not be empty.");
	return content.trimEnd();
}

async function readStdin(): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
	}
	return Buffer.concat(chunks).toString("utf8");
}
