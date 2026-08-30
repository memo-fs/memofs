import type { Command } from "commander";
import {
	runConnectorsAddCommand,
	runConnectorsListCommand,
	runConnectorsRemoveCommand,
	runConnectorsRunCommand,
} from "../commands";
import type { CLIContext } from "./shared";

export function registerConnectorsCommands(program: Command, ctx: CLIContext) {
	const { globals, setExitCode, setCurrentCommand, output } = ctx;

	const connectors = program
		.command("connectors")
		.description(
			"manage local connectors: add, remove, list, run ingestion into .memofs/",
		);

	connectors
		.command("list")
		.description("list configured connectors")
		.action(async () => {
			setCurrentCommand("connectors.list");
			const g = await globals();
			setExitCode(
				await runConnectorsListCommand({
					memo: g.memo,
					output,
					json: g.json,
				}),
			);
		});

	connectors
		.command("add")
		.description("add a connector row to .memofs/connectors.json")
		.requiredOption("--type <type>", "connector type (github, notion, ...)")
		.requiredOption(
			"--secret-ref <ref>",
			"opaque pointer to a token stored server-side",
		)
		.option("--id <id>", "connector id")
		.option("--schedule <schedule>", "schedule hint")
		.option("--source-mapping <json>", "source-specific config as JSON")
		.option("--disabled", "add the connector in disabled state", false)
		.action(async (options) => {
			setCurrentCommand("connectors.add");
			const g = await globals();
			setExitCode(
				await runConnectorsAddCommand({
					memo: g.memo,
					output,
					json: g.json,
					type: options.type,
					secretRef: options.secretRef,
					...(options.id === undefined ? {} : { id: options.id }),
					...(options.schedule === undefined
						? {}
						: { schedule: options.schedule }),
					...(options.sourceMapping === undefined
						? {}
						: { sourceMapping: options.sourceMapping }),
					enabled: !options.disabled,
				}),
			);
		});

	connectors
		.command("remove")
		.description("remove a connector by id")
		.argument("<id>", "connector id to remove")
		.action(async (id) => {
			setCurrentCommand("connectors.remove");
			const g = await globals();
			setExitCode(
				await runConnectorsRemoveCommand({
					memo: g.memo,
					output,
					json: g.json,
					id,
				}),
			);
		});

	connectors
		.command("run")
		.description("run enabled connectors")
		.option("--type <type>", "run only connectors of this type")
		.action(async (options) => {
			setCurrentCommand("connectors.run");
			const g = await globals();
			setExitCode(
				await runConnectorsRunCommand({
					memo: g.memo,
					output,
					json: g.json,
					...(options.type === undefined ? {} : { onlyType: options.type }),
				}),
			);
		});
}
