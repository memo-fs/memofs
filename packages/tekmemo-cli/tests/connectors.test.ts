import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createTempTekMemoDir, Tekmemo } from "@tekbreed/tekmemo";
import {
	type Connector,
	type ConnectorIngestContext,
	type ConnectorRecord,
	ConnectorRegistry,
} from "@tekbreed/tekmemo-connectors";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	runConnectorsAddCommand,
	runConnectorsListCommand,
	runConnectorsRemoveCommand,
	runConnectorsRunCommand,
} from "../src/commands/connectors";
import { createBufferedOutput } from "../src/output/output";

/**
 * A fake connector for `connectors run` tests — no network. Yields fixed
 * records so the run path can be exercised without hitting GitHub/Notion.
 */
class FakeConnector implements Connector {
	readonly type = "fake";
	readonly displayName = "Fake";
	readonly records: readonly ConnectorRecord[];

	constructor(records: readonly ConnectorRecord[]) {
		this.records = records;
	}

	async ingest(
		_ctx: ConnectorIngestContext,
	): Promise<readonly ConnectorRecord[]> {
		return this.records;
	}
}

function record(externalId: string, content: string): ConnectorRecord {
	return {
		externalId,
		title: `Title ${externalId}`,
		content,
		url: `https://example.com/${externalId}`,
	};
}

/**
 * CLI integration tests for the `tekmemo connectors` command group. The
 * `add`/`list`/`remove` cycle goes through the real CLI runner (full commander
 * dispatch); the `run` command is tested at the command-function level with an
 * injected fake registry so no network is hit.
 */
describe("connectors CLI", () => {
	describe("add / list / remove (via command functions)", () => {
		let temp: { rootDir: string; cleanup: () => Promise<void> };
		let memo: Tekmemo;

		beforeEach(async () => {
			temp = await createTempTekMemoDir();
			memo = new Tekmemo({ rootDir: temp.rootDir, mode: "local" });
		});

		afterEach(async () => {
			// Release the Q28 advisory lock via the store (Tekmemo itself has no
			// dispose — the store owns the lock).
			const store = memo.store as { dispose?: () => Promise<void> };
			await store.dispose?.();
			await temp.cleanup();
		});

		it("add writes a connector row, list shows it, remove deletes it", async () => {
			const output = createBufferedOutput();

			// Add
			const addResult = await runConnectorsAddCommand({
				memo,
				output,
				type: "github",
				secretRef: "ss_abc",
				id: "github-main",
				sourceMapping: '{"repository":"owner/repo"}',
			});
			expect(addResult).toBe(0);
			expect(output.stdout.join("")).toContain("Added connector");

			// List
			const listOutput = createBufferedOutput();
			const listResult = await runConnectorsListCommand({
				memo,
				output: listOutput,
			});
			expect(listResult).toBe(0);
			const listText = listOutput.stdout.join("");
			expect(listText).toContain("github-main");
			expect(listText).toContain("github");
			expect(listText).toContain("owner/repo");

			// Remove
			const removeOutput = createBufferedOutput();
			const removeResult = await runConnectorsRemoveCommand({
				memo,
				output: removeOutput,
				id: "github-main",
			});
			expect(removeResult).toBe(0);
			expect(removeOutput.stdout.join("")).toContain("Removed");

			// List again — empty
			const emptyListOutput = createBufferedOutput();
			await runConnectorsListCommand({ memo, output: emptyListOutput });
			expect(emptyListOutput.stdout.join("")).toContain("No connectors");
		});

		it("add rejects a duplicate id", async () => {
			await runConnectorsAddCommand({
				memo: memo,
				output: createBufferedOutput(),
				type: "github",
				secretRef: "ss_a",
				id: "dup",
			});

			await expect(
				runConnectorsAddCommand({
					memo,
					output: createBufferedOutput(),
					type: "github",
					secretRef: "ss_b",
					id: "dup",
				}),
			).rejects.toThrow(/already exists/);
		});

		it("add defaults the id to <type> when not provided", async () => {
			const output = createBufferedOutput();
			await runConnectorsAddCommand({
				memo,
				output,
				type: "notion",
				secretRef: "ss_n",
			});

			const listOutput = createBufferedOutput();
			await runConnectorsListCommand({ memo, output: listOutput });
			expect(listOutput.stdout.join("")).toContain("notion (notion)");
		});

		it("add with --disabled adds the connector disabled", async () => {
			await runConnectorsAddCommand({
				memo,
				output: createBufferedOutput(),
				type: "github",
				secretRef: "ss_x",
				id: "gh",
				enabled: false,
			});

			const listOutput = createBufferedOutput();
			await runConnectorsListCommand({ memo, output: listOutput });
			expect(listOutput.stdout.join("")).toContain("disabled");
		});

		it("remove throws on a missing id", async () => {
			await expect(
				runConnectorsRemoveCommand({
					memo,
					output: createBufferedOutput(),
					id: "nonexistent",
				}),
			).rejects.toThrow(/No connector/);
		});

		it("add rejects malformed sourceMapping JSON", async () => {
			await expect(
				runConnectorsAddCommand({
					memo,
					output: createBufferedOutput(),
					type: "github",
					secretRef: "ss_x",
					sourceMapping: "{not json",
				}),
			).rejects.toThrow(/valid JSON/);
		});

		it("JSON output returns a structured envelope", async () => {
			const output = createBufferedOutput();
			await runConnectorsAddCommand({
				memo,
				output,
				json: true,
				type: "github",
				secretRef: "ss_j",
				id: "gh-json",
			});
			const parsed = JSON.parse(output.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.command).toBe("connectors.add");
			expect(parsed.data.added.id).toBe("gh-json");
		});
	});

	describe("run (with a fake connector injected via registry)", () => {
		let rootDir: string;
		let memo: Tekmemo;

		beforeEach(async () => {
			rootDir = await mkdtemp(path.join(tmpdir(), "tekmemo-cli-run-"));
			await mkdir(path.join(rootDir, ".tekmemo"), { recursive: true });
			memo = new Tekmemo({ rootDir, mode: "local" });
		});

		afterEach(async () => {
			const store = memo.store as { dispose?: () => Promise<void> };
			await store.dispose?.();
			await rm(rootDir, { recursive: true, force: true });
		});

		it("runs a fake connector and writes notes", async () => {
			// Seed a connectors.json + a secrets.json so EnvSecretResolver works.
			await writeFile(
				path.join(rootDir, ".tekmemo/connectors.json"),
				JSON.stringify({
					connectors: [
						{
							id: "fake",
							type: "fake",
							enabled: true,
							secretRef: "ss_t",
						},
					],
				}),
			);
			await mkdir(path.join(rootDir, ".tekmemo"), { recursive: true });
			await writeFile(
				path.join(rootDir, ".tekmemo/secrets.json"),
				JSON.stringify({ ss_t: "test-token" }),
			);

			const registry = new ConnectorRegistry([
				new FakeConnector([record("a:1", "first"), record("a:2", "second")]),
			]);
			const output = createBufferedOutput();

			const result = await runConnectorsRunCommand({
				memo,
				output,
				registry,
			});

			expect(result).toBe(0);
			const text = output.stdout.join("");
			expect(text).toContain("written: 2");
			expect(text).toContain("ran: fake");
		});

		it("skips unchanged records on a re-run", async () => {
			await writeFile(
				path.join(rootDir, ".tekmemo/connectors.json"),
				JSON.stringify({
					connectors: [
						{ id: "fake", type: "fake", enabled: true, secretRef: "ss_t" },
					],
				}),
			);
			await writeFile(
				path.join(rootDir, ".tekmemo/secrets.json"),
				JSON.stringify({ ss_t: "test-token" }),
			);

			const registry = new ConnectorRegistry([
				new FakeConnector([record("a:1", "stable")]),
			]);

			const firstOutput = createBufferedOutput();
			await runConnectorsRunCommand({ memo, output: firstOutput, registry });
			expect(firstOutput.stdout.join("")).toContain("written: 1");

			// Second run — the same record is deduped.
			const secondOutput = createBufferedOutput();
			await runConnectorsRunCommand({ memo, output: secondOutput, registry });
			const secondText = secondOutput.stdout.join("");
			expect(secondText).toContain("written: 0");
			expect(secondText).toContain("skipped (already ingested): 1");
		});

		it("JSON output returns a structured run envelope", async () => {
			await writeFile(
				path.join(rootDir, ".tekmemo/connectors.json"),
				JSON.stringify({
					connectors: [
						{ id: "fake", type: "fake", enabled: true, secretRef: "ss_t" },
					],
				}),
			);
			await writeFile(
				path.join(rootDir, ".tekmemo/secrets.json"),
				JSON.stringify({ ss_t: "test-token" }),
			);

			const registry = new ConnectorRegistry([
				new FakeConnector([record("a:1", "body")]),
			]);
			const output = createBufferedOutput();

			await runConnectorsRunCommand({
				memo,
				output,
				json: true,
				registry,
			});
			const parsed = JSON.parse(output.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.command).toBe("connectors.run");
			expect(parsed.data.written).toHaveLength(1);
		});

		it("reports errors without aborting (no secrets file → secret error recorded)", async () => {
			await writeFile(
				path.join(rootDir, ".tekmemo/connectors.json"),
				JSON.stringify({
					connectors: [
						{
							id: "fake",
							type: "fake",
							enabled: true,
							secretRef: "ss_missing",
						},
					],
				}),
			);
			// No secrets.json → EnvSecretResolver throws ConnectorSecretError.

			const registry = new ConnectorRegistry([
				new FakeConnector([record("a:1", "body")]),
			]);
			const output = createBufferedOutput();

			const result = await runConnectorsRunCommand({
				memo,
				output,
				registry,
			});
			// Errors present → exit code 1.
			expect(result).toBe(1);
			const text = output.stdout.join("");
			expect(text).toContain("errors: 1");
		});
	});
});
