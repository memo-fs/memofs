import type { Command } from "commander";
import {
	runCloudHealthCommand,
	runCloudReadinessCommand,
	runCloudSyncPullCommand,
	runCloudSyncPushCommand,
	runCloudSyncStatusCommand,
} from "../commands";
import { CliUsageError } from "../errors/cli-errors";
import type { CLIContext } from "./shared";

export function registerCloudCommands(program: Command, ctx: CLIContext) {
	const { globals, setExitCode, setCurrentCommand, output, stdinContent } = ctx;

	const cloud = program
		.command("cloud")
		.description("use MemoFS Cloud file-replica sync");

	async function cloudGlobals() {
		const g = await globals();
		if (!g.memo.cloud) {
			throw new CliUsageError(
				"Cloud sync requires --cloud-url and --api-key or MEMOFS_CLOUD_URL/MEMOFS_API_KEY",
			);
		}
		return {
			...g,
			client: g.memo.cloud,
		};
	}

	cloud
		.command("health")
		.description("check MemoFS Cloud health")
		.action(async () => {
			setCurrentCommand("cloud.health");
			const g = await cloudGlobals();
			setExitCode(
				await runCloudHealthCommand({
					output,
					json: g.json,
					client: g.client,
				}),
			);
		});

	cloud
		.command("readiness")
		.description("check MemoFS Cloud readiness")
		.action(async () => {
			setCurrentCommand("cloud.readiness");
			const g = await cloudGlobals();
			setExitCode(
				await runCloudReadinessCommand({
					output,
					json: g.json,
					client: g.client,
				}),
			);
		});

	const sync = cloud
		.command("sync")
		.description("use MemoFS Cloud file-replica sync APIs");

	sync
		.command("status")
		.description("read cloud sync status")
		.action(async () => {
			setCurrentCommand("cloud.sync.status");
			const g = await cloudGlobals();
			setExitCode(
				await runCloudSyncStatusCommand({
					output,
					json: g.json,
					client: g.client,
				}),
			);
		});

	sync
		.command("pull")
		.description("pull file replicas from the cloud")
		.option("--since <cursor>", "pull everything changed since this cursor")
		.action(async (options) => {
			setCurrentCommand("cloud.sync.pull");
			const g = await cloudGlobals();
			setExitCode(
				await runCloudSyncPullCommand({
					output,
					json: g.json,
					rootDir: g.root,
					client: g.client,
					since: options.since,
				}),
			);
		});

	sync
		.command("push")
		.description("push local .memofs/ file replicas to the cloud")
		.option("--base-cursor <cursor>", "cursor the client last synced at")
		.action(async (options) => {
			setCurrentCommand("cloud.sync.push");
			const g = await cloudGlobals();
			setExitCode(
				await runCloudSyncPushCommand({
					output,
					json: g.json,
					rootDir: g.root,
					stdinContent: stdinContent,
					client: g.client,
					baseCursor: options.baseCursor,
				}),
			);
		});
}
