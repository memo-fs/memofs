import path from "node:path";
import type { Command } from "commander";
import type { MemoFsConfigFile } from "../config";
import { resolveSchemaPath, writeDefaultCliConfig } from "../config";
import { printJsonEnvelope } from "../output/output";
import type { CLIContext } from "./shared";

export function registerConfigCommands(program: Command, ctx: CLIContext) {
	const { globals, setCurrentCommand, output, cwd } = ctx;

	const configCmd = program
		.command("config")
		.description("inspect or create .memofs/config.json");

	configCmd
		.command("get")
		.description("print resolved CLI configuration")
		.action(async () => {
			setCurrentCommand("config.get");
			const g = await globals();
			const safeConfig = {
				mode: g.memo.mode,
				projectId: g.memo.projectId,
				...(g.memo.workspaceId !== undefined
					? { workspaceId: g.memo.workspaceId }
					: {}),
				...(g.memo.cloud
					? { cloud: { configured: true } }
					: { cloud: { configured: false } }),
			};
			if (g.json) printJsonEnvelope(output, "config.get", safeConfig);
			else output.write(JSON.stringify(safeConfig, null, 2));
		});

	configCmd
		.command("init")
		.description("create .memofs/config.json without storing secrets")
		.option("-f, --force", "overwrite existing config", false)
		.action(async (options) => {
			setCurrentCommand("config.init");
			const g = await globals();
			// `--runtime`, `--cloud-url`, `--workspace-id`, and `--project-id` are
			// declared as global options on the parent program. Re-declaring them
			// on this subcommand causes Commander to shadow the subcommand storage
			// with the parent's, so the parsed values land in `program.opts()` and
			// the subcommand's options fall back to their defaults. Read them from
			// the global program opts instead — the documented UX
			// (`memofs config init --runtime hybrid --cloud-url ...`) keeps working.
			const programOpts = program.opts() as {
				runtime?: string;
				cloudUrl?: string;
				workspaceId?: string;
				projectId?: string;
			};
			const rootDir = path.resolve(cwd ?? process.cwd(), g.root);
			const result = await writeDefaultCliConfig({
				cwd: cwd ?? process.cwd(),
				root: g.root,
				force: options.force,
				config: {
					$schema: resolveSchemaPath(rootDir),
					runtime:
						(programOpts.runtime as MemoFsConfigFile["runtime"]) ?? "local",
					root: ".",
					cloud: {
						...(programOpts.cloudUrl ? { baseUrl: programOpts.cloudUrl } : {}),
						...(programOpts.workspaceId
							? { workspaceId: programOpts.workspaceId }
							: {}),
						...(programOpts.projectId
							? { projectId: programOpts.projectId }
							: {}),
					},
					recall: { engine: "auto", localEmbeddings: true },
				} satisfies MemoFsConfigFile,
			});
			if (g.json) printJsonEnvelope(output, "config.init", result);
			else if (result.created) output.success(`Created ${result.path}`);
			else if (result.overwritten) output.success(`Overwrote ${result.path}`);
			else
				output.warn(`${result.path} already exists. Use --force to overwrite.`);
		});
}
