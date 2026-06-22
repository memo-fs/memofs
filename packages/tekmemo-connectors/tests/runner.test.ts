import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	CONNECTORS_PATH,
	InMemoryMemoryStore,
	Tekmemo,
} from "@tekbreed/tekmemo";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type Connector,
	type ConnectorConfig,
	type ConnectorIngestContext,
	type ConnectorRecord,
	ConnectorRegistry,
	createConnectorRegistry,
	type RunConnectorsOptions,
	runConnectors,
	StaticSecretResolver,
} from "../src/index";

/**
 * A fake connector for runner tests — no network. Yields a fixed set of
 * records, optionally throws on demand to exercise error isolation.
 */
class FakeConnector implements Connector {
	readonly type: string;
	readonly displayName: string;
	readonly records: readonly ConnectorRecord[];
	readonly ingestCalls: ConnectorIngestContext[] = [];
	/** When set, the next `ingest` call throws this error, then clears it. */
	private pendingThrow?: Error;

	constructor(
		type: string,
		records: readonly ConnectorRecord[],
		opts: { throwOnce?: Error; displayName?: string } = {},
	) {
		this.type = type;
		this.displayName = opts.displayName ?? `Fake ${type}`;
		this.records = records;
		if (opts.throwOnce) this.pendingThrow = opts.throwOnce;
	}

	async ingest(
		ctx: ConnectorIngestContext,
	): Promise<readonly ConnectorRecord[]> {
		this.ingestCalls.push(ctx);
		if (this.pendingThrow) {
			const err = this.pendingThrow;
			this.pendingThrow = undefined;
			throw err;
		}
		return this.records;
	}
}

function record(
	externalId: string,
	content: string,
	extras: Partial<ConnectorRecord> = {},
): ConnectorRecord {
	return {
		externalId,
		title: `Title ${externalId}`,
		content,
		url: `https://example.com/${externalId}`,
		...(extras as Record<string, unknown>),
	} as ConnectorRecord;
}

function connectorConfig(
	id: string,
	type: string,
	secretRef = "ss_a",
): ConnectorConfig {
	return {
		id,
		type,
		enabled: true,
		secretRef,
	};
}

async function writeConnectorsFile(
	rootDir: string,
	connectors: ConnectorConfig[],
): Promise<void> {
	await mkdir(join(rootDir, ".tekmemo"), { recursive: true });
	await writeFile(
		join(rootDir, CONNECTORS_PATH),
		JSON.stringify({ connectors }),
		"utf8",
	);
}

describe("runConnectors", () => {
	let rootDir: string;
	let memo: Tekmemo;
	let store: InMemoryMemoryStore;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "tekmemo-runner-"));
		store = new InMemoryMemoryStore();
		memo = new Tekmemo({ mode: "memory", store });
	});

	afterEach(async () => {
		await rm(rootDir, { recursive: true, force: true });
	});

	function opts(extras: Partial<RunConnectorsOptions>): RunConnectorsOptions {
		return {
			rootDir,
			memo,
			secretResolver: new StaticSecretResolver({
				ss_a: "token-a",
				ss_b: "token-b",
			}),
			...extras,
		};
	}

	it("writes connector records as notes with the Q3 discipline", async () => {
		await writeConnectorsFile(rootDir, [connectorConfig("gh", "fake")]);
		const connector = new FakeConnector("fake", [
			record("issue:1", "first body"),
			record("issue:2", "second body"),
		]);
		const registry = new ConnectorRegistry([connector]);

		const result = await runConnectors(opts({ connectorRegistry: registry }));

		expect(result.written).toHaveLength(2);
		expect(result.skipped).toEqual([]);
		expect(result.errors).toEqual([]);
		expect(result.ran).toEqual(["gh"]);

		// Every written id is a content-derived conn_ id.
		for (const id of result.written) {
			expect(id).toMatch(/^conn_[0-9a-f]{16}$/);
		}

		// The connector received the resolved token (never written to disk).
		expect(connector.ingestCalls).toHaveLength(1);
		expect(connector.ingestCalls[0]?.token).toBe("token-a");
	});

	it("skips unchanged records on a re-run (dedup by content-derived id)", async () => {
		await writeConnectorsFile(rootDir, [connectorConfig("gh", "fake")]);
		const records = [record("issue:1", "stable body")];
		const registry = new ConnectorRegistry([
			new FakeConnector("fake", records),
		]);

		const first = await runConnectors(opts({ connectorRegistry: registry }));
		expect(first.written).toHaveLength(1);
		expect(first.skipped).toEqual([]);

		const second = await runConnectors(opts({ connectorRegistry: registry }));
		expect(second.written).toEqual([]);
		expect(second.skipped).toEqual(["issue:1"]);
	});

	it("re-writes a record whose content changed (new id → not skipped)", async () => {
		await writeConnectorsFile(rootDir, [connectorConfig("gh", "fake")]);
		const registry = new ConnectorRegistry([
			new FakeConnector("fake", [record("issue:1", "v1 body")]),
		]);

		const first = await runConnectors(opts({ connectorRegistry: registry }));
		expect(first.written).toHaveLength(1);

		// Same externalId, different content → different note id → written again.
		registry.register(
			new FakeConnector("fake", [record("issue:1", "v2 body")]),
		);
		const second = await runConnectors(opts({ connectorRegistry: registry }));
		expect(second.written).toHaveLength(1);
		expect(second.skipped).toEqual([]);
		expect(second.written[0]).not.toBe(first.written[0]);
	});

	it("skips disabled connectors", async () => {
		await writeConnectorsFile(rootDir, [
			{ ...connectorConfig("on", "fake"), enabled: true },
			{ ...connectorConfig("off", "fake"), enabled: false },
		]);
		const connector = new FakeConnector("fake", [record("issue:1", "body")]);
		const registry = new ConnectorRegistry([connector]);

		const result = await runConnectors(opts({ connectorRegistry: registry }));

		expect(result.ran).toEqual(["on"]);
		expect(result.written).toHaveLength(1);
	});

	it("filters by onlyType", async () => {
		await writeConnectorsFile(rootDir, [
			connectorConfig("gh", "alpha"),
			connectorConfig("nt", "beta"),
		]);
		const registry = new ConnectorRegistry([
			new FakeConnector("alpha", [record("a:1", "a body")]),
			new FakeConnector("beta", [record("b:1", "b body")]),
		]);

		const result = await runConnectors(
			opts({ connectorRegistry: registry, onlyType: "alpha" }),
		);

		expect(result.ran).toEqual(["gh"]);
		expect(result.written).toHaveLength(1);
	});

	it("does not abort the run when one connector throws", async () => {
		await writeConnectorsFile(rootDir, [
			connectorConfig("boom", "alpha"),
			connectorConfig("ok", "beta"),
		]);
		const registry = new ConnectorRegistry([
			new FakeConnector("alpha", [], { throwOnce: new Error("fetch failed") }),
			new FakeConnector("beta", [record("b:1", "ok body")]),
		]);

		const result = await runConnectors(opts({ connectorRegistry: registry }));

		expect(result.ran).toEqual(["boom", "ok"]);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.connectorType).toBe("alpha");
		expect(result.errors[0]?.message).toContain("fetch failed");
		expect(result.written).toHaveLength(1); // beta still wrote its record
	});

	it("records a secret-resolution failure and continues", async () => {
		await writeConnectorsFile(rootDir, [
			connectorConfig("missing", "fake", "ss_nonexistent"),
			connectorConfig("ok", "beta"),
		]);
		const registry = new ConnectorRegistry([
			new FakeConnector("fake", [record("a:1", "a body")]),
			new FakeConnector("beta", [record("b:1", "b body")]),
		]);

		const result = await runConnectors(opts({ connectorRegistry: registry }));

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.connectorType).toBe("fake");
		expect(result.written).toHaveLength(1); // beta wrote
	});

	it("runs with no connectors configured (empty result)", async () => {
		await writeConnectorsFile(rootDir, []);
		const result = await runConnectors(
			opts({ connectorRegistry: createConnectorRegistry() }),
		);
		expect(result).toEqual({ written: [], skipped: [], errors: [], ran: [] });
	});

	it("runs when connectors.json is missing (treated as empty)", async () => {
		// No file written.
		const result = await runConnectors(
			opts({ connectorRegistry: createConnectorRegistry() }),
		);
		expect(result.ran).toEqual([]);
		expect(result.written).toEqual([]);
	});

	it("the resolved token is never persisted in the note content or metadata", async () => {
		await writeConnectorsFile(rootDir, [connectorConfig("gh", "fake")]);
		const registry = new ConnectorRegistry([
			new FakeConnector("fake", [record("issue:1", "body")]),
		]);

		await runConnectors(opts({ connectorRegistry: registry }));

		const notes = await memo.notes.read();
		expect(notes).not.toContain("token-a");
	});
});
