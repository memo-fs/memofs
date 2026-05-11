import type {
	ResolvedCliRuntimeConfig,
	TekMemoReadPolicy,
	TekMemoWritePolicy,
} from "../config";
import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import {
	type CliOutput,
	createBufferedOutput,
	printJsonEnvelope,
} from "../output/output";
import {
	runCloudContextCommand,
	runCloudReadCommand,
	runCloudRememberCommand,
	runCloudSnapshotCommand,
	runCloudValidateCommand,
} from "./cloud";
import { runContextCommand } from "./context";
import { runReadCommand } from "./read";
import { runRememberCommand } from "./remember";
import { runSnapshotCommand } from "./snapshot";
import { runValidateCommand } from "./validate";

export interface RuntimeCommandBaseOptions {
	fs: TekMemoFileSystem;
	output: CliOutput;
	json?: boolean | undefined;
	stdinContent?: string | undefined;
	config: ResolvedCliRuntimeConfig;
}

export interface RuntimeContextCommandOptions
	extends RuntimeCommandBaseOptions {
	query?: string | undefined;
	maxChars?: number | string | undefined;
	includeEvents?: boolean | undefined;
	includeChunks?: boolean | undefined;
}

export interface RuntimeRememberCommandOptions
	extends RuntimeCommandBaseOptions {
	content?: string | undefined;
	stdin?: boolean | undefined;
	file?: string | undefined;
	kind?: string | undefined;
	title?: string | undefined;
	tags?: string[] | undefined;
	confidence?: string | number | undefined;
	source?: string | undefined;
	actor?: string | undefined;
	metadata?: string | undefined;
	allowSecrets?: boolean | undefined;
}

export interface RuntimeReadCommandOptions extends RuntimeCommandBaseOptions {
	target: "core" | "notes" | "manifest";
}

export interface RuntimeValidateCommandOptions
	extends RuntimeCommandBaseOptions {}

export interface RuntimeSnapshotCommandOptions
	extends RuntimeCommandBaseOptions {
	label?: string | undefined;
}

export async function runRuntimeContextCommand(
	options: RuntimeContextCommandOptions,
): Promise<number> {
	if (options.config.runtime === "cloud") {
		return runCloudContextCommand({
			output: options.output,
			json: options.json,
			...options.config.cloud,
			query: options.query ?? "project context",
			maxBytes: options.maxChars,
		});
	}

	if (options.config.runtime === "local") {
		return runContextCommand({
			fs: options.fs,
			output: options.output,
			json: options.json,
			query: options.query,
			maxChars: options.maxChars,
			includeEvents: options.includeEvents,
			includeChunks: options.includeChunks,
		});
	}

	return runHybridContextCommand(options);
}

export async function runRuntimeRememberCommand(
	options: RuntimeRememberCommandOptions,
): Promise<number> {
	if (options.config.runtime === "cloud")
		return runCloudRememberFromRuntime(options);
	if (options.config.runtime === "local")
		return runLocalRememberFromRuntime(options);
	return runWritePolicy(
		options.config.hybrid.writePolicy,
		() => runLocalRememberFromRuntime(options),
		() => runCloudRememberFromRuntime(options),
	);
}

export async function runRuntimeReadCommand(
	options: RuntimeReadCommandOptions,
): Promise<number> {
	if (options.target === "manifest") return runLocalReadFromRuntime(options);
	if (options.config.runtime === "cloud")
		return runCloudReadFromRuntime(options);
	if (options.config.runtime === "local")
		return runLocalReadFromRuntime(options);
	return runReadPolicy(
		options.config.hybrid.readPolicy,
		() => runLocalReadFromRuntime(options),
		() => runCloudReadFromRuntime(options),
	);
}

export async function runRuntimeValidateCommand(
	options: RuntimeValidateCommandOptions,
): Promise<number> {
	if (options.config.runtime === "cloud")
		return runCloudValidateCommand({
			output: options.output,
			json: options.json,
			...options.config.cloud,
		});
	if (options.config.runtime === "local")
		return runValidateCommand({
			fs: options.fs,
			output: options.output,
			json: options.json,
		});

	const local = createBufferedOutput({ noColor: true });
	const cloud = createBufferedOutput({ noColor: true });
	const localExit = await runValidateCommand({
		fs: options.fs,
		output: local,
		json: options.json,
	});
	const cloudExit = await runCloudValidateCommand({
		output: cloud,
		json: options.json,
		...options.config.cloud,
	}).catch((error: unknown) => {
		cloud.error(error instanceof Error ? error.message : String(error));
		return 1;
	});
	if (options.json) {
		printJsonEnvelope(options.output, "validate", {
			runtime: "hybrid",
			local: {
				exitCode: localExit,
				stdout: local.stdout,
				stderr: local.stderr,
			},
			cloud: {
				exitCode: cloudExit,
				stdout: cloud.stdout,
				stderr: cloud.stderr,
			},
		});
		return localExit === 0 && cloudExit === 0 ? 0 : 1;
	}
	options.output.write(
		[
			"# Local validation",
			...local.stdout,
			"",
			"# Cloud validation",
			...cloud.stdout,
		].join("\n"),
	);
	for (const line of [...local.stderr, ...cloud.stderr])
		options.output.error(line);
	return localExit === 0 && cloudExit === 0 ? 0 : 1;
}

export async function runRuntimeSnapshotCommand(
	options: RuntimeSnapshotCommandOptions,
): Promise<number> {
	if (options.config.runtime === "cloud")
		return runCloudSnapshotCommand({
			output: options.output,
			json: options.json,
			...options.config.cloud,
			label: options.label,
		});
	if (options.config.runtime === "local")
		return runSnapshotCommand({
			fs: options.fs,
			output: options.output,
			json: options.json,
			label: options.label ?? "manual",
		});
	return runWritePolicy(
		options.config.hybrid.writePolicy,
		() =>
			runSnapshotCommand({
				fs: options.fs,
				output: options.output,
				json: options.json,
				label: options.label ?? "manual",
			}),
		() =>
			runCloudSnapshotCommand({
				output: options.output,
				json: options.json,
				...options.config.cloud,
				label: options.label,
			}),
	);
}

async function runHybridContextCommand(
	options: RuntimeContextCommandOptions,
): Promise<number> {
	const readPolicy = options.config.hybrid.readPolicy;
	if (readPolicy === "local-only") {
		return runContextCommand({
			fs: options.fs,
			output: options.output,
			json: options.json,
			query: options.query,
			maxChars: options.maxChars,
			includeEvents: options.includeEvents,
			includeChunks: options.includeChunks,
		});
	}
	if (readPolicy === "cloud-only") {
		return runCloudContextCommand({
			output: options.output,
			json: options.json,
			...options.config.cloud,
			query: options.query ?? "project context",
			maxBytes: options.maxChars,
		});
	}

	const local = createBufferedOutput({ noColor: true });
	const cloud = createBufferedOutput({ noColor: true });
	const localExit = await runContextCommand({
		fs: options.fs,
		output: local,
		json: false,
		query: options.query,
		maxChars: options.maxChars,
		includeEvents: options.includeEvents,
		includeChunks: options.includeChunks,
	});
	const cloudExit = await runCloudContextCommand({
		output: cloud,
		json: false,
		...options.config.cloud,
		query: options.query ?? "project context",
		maxBytes: options.maxChars,
	}).catch((error: unknown) => {
		cloud.error(error instanceof Error ? error.message : String(error));
		return 1;
	});
	const first =
		readPolicy === "cloud-first"
			? { label: "Cloud", out: cloud, code: cloudExit }
			: { label: "Local", out: local, code: localExit };
	const second =
		readPolicy === "cloud-first"
			? { label: "Local", out: local, code: localExit }
			: { label: "Cloud", out: cloud, code: cloudExit };
	if (options.json) {
		printJsonEnvelope(options.output, "context", {
			runtime: "hybrid",
			readPolicy,
			[first.label.toLowerCase()]: {
				exitCode: first.code,
				stdout: first.out.stdout,
				stderr: first.out.stderr,
			},
			[second.label.toLowerCase()]: {
				exitCode: second.code,
				stdout: second.out.stdout,
				stderr: second.out.stderr,
			},
		});
		return first.code === 0 || second.code === 0 ? 0 : 1;
	}
	options.output.write(
		[
			`# TekMemo Hybrid Context`,
			`Read policy: ${readPolicy}`,
			"",
			`## ${first.label} Context`,
			...first.out.stdout,
			"",
			`## ${second.label} Context`,
			...second.out.stdout,
		].join("\n"),
	);
	for (const line of [...first.out.stderr, ...second.out.stderr])
		options.output.error(line);
	return first.code === 0 || second.code === 0 ? 0 : 1;
}

async function runLocalRememberFromRuntime(
	options: RuntimeRememberCommandOptions,
): Promise<number> {
	return runRememberCommand({
		fs: options.fs,
		output: options.output,
		json: options.json,
		content: options.content,
		stdin: options.stdin,
		file: options.file,
		stdinContent: options.stdinContent,
		kind: options.kind,
		title: options.title,
		tags: options.tags,
		confidence: options.confidence,
		source: options.source,
		actor: options.actor,
		metadata: options.metadata,
		allowSecrets: options.allowSecrets,
	});
}

async function runCloudRememberFromRuntime(
	options: RuntimeRememberCommandOptions,
): Promise<number> {
	return runCloudRememberCommand({
		output: options.output,
		json: options.json,
		rootDir: options.config.root,
		stdinContent: options.stdinContent,
		...options.config.cloud,
		content: options.content,
		stdin: options.stdin,
		file: options.file,
		kind: options.kind,
		title: options.title,
		tags: options.tags,
		confidence: options.confidence,
		source: options.source,
		metadata: options.metadata,
		allowSecrets: options.allowSecrets,
	});
}

async function runLocalReadFromRuntime(
	options: RuntimeReadCommandOptions,
): Promise<number> {
	return runReadCommand({
		fs: options.fs,
		output: options.output,
		json: options.json,
		target: options.target,
	});
}

async function runCloudReadFromRuntime(
	options: RuntimeReadCommandOptions,
): Promise<number> {
	if (options.target === "manifest") {
		throw new Error(
			"Cloud runtime cannot read local manifest. Use --runtime local or read core/notes.",
		);
	}
	return runCloudReadCommand({
		output: options.output,
		json: options.json,
		...options.config.cloud,
		target: options.target,
	});
}

async function runReadPolicy(
	policy: TekMemoReadPolicy,
	local: () => Promise<number>,
	cloud: () => Promise<number>,
): Promise<number> {
	if (policy === "local-only") return local();
	if (policy === "cloud-only") return cloud();
	if (policy === "cloud-first") {
		const cloudCode = await cloud();
		return cloudCode === 0 ? cloudCode : local();
	}
	const localCode = await local();
	return localCode === 0 ? localCode : cloud();
}

async function runWritePolicy(
	policy: TekMemoWritePolicy,
	local: () => Promise<number>,
	cloud: () => Promise<number>,
): Promise<number> {
	if (policy === "local-only") return local();
	if (policy === "cloud-only") return cloud();
	if (policy === "cloud-first") {
		const cloudCode = await cloud();
		const localCode = await local();
		return cloudCode === 0 && localCode === 0 ? 0 : 1;
	}
	const localCode = await local();
	const cloudCode = await cloud();
	return localCode === 0 && cloudCode === 0 ? 0 : 1;
}
