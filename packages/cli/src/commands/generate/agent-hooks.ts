/**
 * CLI command handler for `memofs generate agent-hooks <target>`.
 *
 * Emits only the hooks file for a given platform (no rules file). This is
 * the sub-command for users who already have a hand-edited rules file and
 * just want to add MemoFS hooks.
 *
 * @module agent-hooks
 */

import type { MemoFS } from "@memofs/core";
import { getRootDir } from "../../cli/store-helpers";
import { CliUsageError } from "../../errors/cli-errors";
import type { CliOutput } from "../../output/output";
import { printJsonEnvelope } from "../../output/output";
import { getEmitter, HOOK_EMITTER_TARGETS } from "./emitters";
import { writeEmittedHookFiles } from "./file-utils";
import {
	compactionSurvivalModule,
	contextInjectionModule,
	statusDisplayModule,
	subagentInjectionModule,
} from "./hooks";

const ALL_MODULES = [
	contextInjectionModule,
	subagentInjectionModule,
	compactionSurvivalModule,
	statusDisplayModule,
];

export interface GenerateAgentHooksCommandOptions {
	readonly memo: MemoFS;
	readonly output: CliOutput;
	readonly json?: boolean;
	readonly target?: string;
	readonly list?: boolean;
	readonly force?: boolean;
}

export async function runGenerateAgentHooksCommand(
	options: GenerateAgentHooksCommandOptions,
): Promise<number> {
	if (options.list) {
		const targets = HOOK_EMITTER_TARGETS.map((t) => {
			const emitter = getEmitter(t);
			return {
				target: t,
				capabilities: emitter?.capabilities,
			};
		});
		if (options.json) {
			printJsonEnvelope(options.output, "generate.agent-hooks.list", targets);
		} else {
			const lines = ["Supported agent-hooks targets:", ""];
			for (const t of targets) {
				lines.push(
					` ${t.target.padEnd(10)} capabilities: ${JSON.stringify(t.capabilities)}`,
				);
			}
			options.output.write(lines.join("\n"));
		}
		return 0;
	}

	if (!options.target) {
		throw new CliUsageError(
			`target is required (${HOOK_EMITTER_TARGETS.join(" | ")}). Use --list to see options.`,
		);
	}

	const emitter = getEmitter(options.target);
	if (!emitter) {
		throw new CliUsageError(
			`Unknown target "${options.target}". Supported: ${HOOK_EMITTER_TARGETS.join(", ")}.`,
		);
	}

	const rootDir = getRootDir(options.memo.store);
	const files = emitter.emitHooks(ALL_MODULES);

	const results = await writeEmittedHookFiles(
		rootDir,
		files,
		options.force ?? false,
	);

	if (options.json) {
		printJsonEnvelope(options.output, "generate.agent-hooks", {
			target: options.target,
			files: results,
		});
	} else {
		for (const r of results) {
			if (r.created) {
				options.output.success(`Generated ${r.path}`);
			} else {
				options.output.warn(
					`${r.path} already exists. Re-run with --force to overwrite.`,
				);
			}
		}
	}
	return 0;
}
