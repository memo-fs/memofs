import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MEMOFS_DIR } from "@memofs/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	ConnectorSecretError,
	EnvSecretResolver,
	StaticSecretResolver,
} from "../src/index";

/** Write `.memofs/secrets.json` with the given JSON under rootDir. */
async function writeSecretsFile(rootDir: string, json: string): Promise<void> {
	await mkdir(join(rootDir, MEMOFS_DIR), { recursive: true });
	await writeFile(join(rootDir, MEMOFS_DIR, "secrets.json"), json, "utf8");
}

describe("StaticSecretResolver", () => {
	it("resolves a known ref", async () => {
		const resolver = new StaticSecretResolver({ ss_a: "tok-a" });
		await expect(resolver.resolve("ss_a")).resolves.toBe("tok-a");
	});

	it("throws ConnectorSecretError for an unknown ref", async () => {
		const resolver = new StaticSecretResolver({ ss_a: "tok-a" });
		await expect(resolver.resolve("ss_missing")).rejects.toBeInstanceOf(
			ConnectorSecretError,
		);
	});

	it("the error carries the offending ref", async () => {
		const resolver = new StaticSecretResolver({});
		try {
			await resolver.resolve("ss_x");
			throw new Error("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(ConnectorSecretError);
			expect((error as ConnectorSecretError).secretRef).toBe("ss_x");
		}
	});
});

describe("EnvSecretResolver", () => {
	let rootDir: string;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "memofs-sec-"));
	});

	afterEach(async () => {
		await rm(rootDir, { recursive: true, force: true });
	});

	it("resolves a ref present in `.memofs/secrets.json`", async () => {
		await writeSecretsFile(rootDir, JSON.stringify({ ss_abc: "tok-123" }));
		const resolver = new EnvSecretResolver({ rootDir });
		await expect(resolver.resolve("ss_abc")).resolves.toBe("tok-123");
	});

	it("throws ConnectorSecretError when the secrets file is missing", async () => {
		const resolver = new EnvSecretResolver({ rootDir });
		await expect(resolver.resolve("ss_abc")).rejects.toBeInstanceOf(
			ConnectorSecretError,
		);
	});

	it("throws ConnectorSecretError when the ref is absent from the file", async () => {
		await writeSecretsFile(rootDir, JSON.stringify({ ss_other: "tok" }));
		const resolver = new EnvSecretResolver({ rootDir });
		await expect(resolver.resolve("ss_missing")).rejects.toBeInstanceOf(
			ConnectorSecretError,
		);
	});

	it("throws on malformed JSON", async () => {
		await writeSecretsFile(rootDir, "{ broken");
		const resolver = new EnvSecretResolver({ rootDir });
		await expect(resolver.resolve("ss_x")).rejects.toBeInstanceOf(
			ConnectorSecretError,
		);
	});

	it("throws when the secrets file is not a JSON object", async () => {
		await writeSecretsFile(rootDir, JSON.stringify(["not", "an", "object"]));
		const resolver = new EnvSecretResolver({ rootDir });
		await expect(resolver.resolve("ss_x")).rejects.toBeInstanceOf(
			ConnectorSecretError,
		);
	});

	it("caches the file across resolves (single read)", async () => {
		await writeSecretsFile(rootDir, JSON.stringify({ ss_a: "1", ss_b: "2" }));
		const resolver = new EnvSecretResolver({ rootDir });
		await resolver.resolve("ss_a");
		// Even if the file changed on disk, the cache holds — proving one read.
		await writeSecretsFile(rootDir, JSON.stringify({ ss_a: "changed" }));
		await expect(resolver.resolve("ss_a")).resolves.toBe("1");
	});
});
