/**
 * Unit + integration tests for `@anchor` marker parsing and TypeScript
 * Compiler API symbol extraction.
 *
 * - `parseAnchorMarker` — pure regex parsing of `@anchor(file=…, symbol=…)` markers
 *   from content.
 * - `extractSymbolPath` — TS Compiler validation that a dotted symbol
 *   path exists in a `.ts`/`.tsx` file.
 * - `resolveWriteAnchor` — the write-path entry point that combines
 *   marker parsing + hash computation + symbol extraction.
 * - End-to-end write integration through `MemoFS.writeMemory` — the
 *   `@anchor` marker in content round-trips through recall with
 *   `AnchorRef.symbol` populated for TS files and `undefined` for non-TS.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type AnchorRef, MemoFS } from "../../src/index";
import {
	extractSymbolPath,
	isSafeAnchorPath,
	isTsFilePath,
	parseAnchorMarker,
	parseSymbolPath,
	resolveWriteAnchor,
} from "../../src/memofs/local-strategy/anchor-marker";
import { NodeFsMemoryStore } from "../../src/node-fs";

// ---------------------------------------------------------------------------
// parseAnchorMarker — pure regex parsing
// ---------------------------------------------------------------------------

describe("parseAnchorMarker", () => {
	it("parses @anchor(file=…, symbol=…)", () => {
		const result = parseAnchorMarker(
			"Auth uses Supabase @anchor(file=src/auth/provider.ts, symbol=verifyJwt) for JWT.",
		);
		expect(result).toEqual({
			file: "src/auth/provider.ts",
			symbol: "verifyJwt",
		});
	});

	it("parses @anchor(file=…) without symbol", () => {
		const result = parseAnchorMarker(
			"Auth uses Supabase @anchor(file=src/auth/provider.ts) for JWT.",
		);
		expect(result).toEqual({ file: "src/auth/provider.ts" });
	});

	it("parses a dotted symbol path", () => {
		const result = parseAnchorMarker(
			"@anchor(file=src/auth/index.ts, symbol=AuthProvider.verifyJwt)",
		);
		expect(result).toEqual({
			file: "src/auth/index.ts",
			symbol: "AuthProvider.verifyJwt",
		});
	});

	it("tolerates whitespace around file= and symbol=", () => {
		const result = parseAnchorMarker(
			"@anchor(  file=src/auth.ts  ,  symbol=verifyJwt  )",
		);
		expect(result).toEqual({ file: "src/auth.ts", symbol: "verifyJwt" });
	});

	it("returns undefined when no marker is present", () => {
		expect(parseAnchorMarker("Just a normal memory with no anchor.")).toBe(
			undefined,
		);
	});

	it("picks the first marker when multiple are present", () => {
		const result = parseAnchorMarker(
			"@anchor(file=a.ts, symbol=first) and @anchor(file=b.ts, symbol=second)",
		);
		expect(result).toEqual({ file: "a.ts", symbol: "first" });
	});

	it("handles file paths with dots, hyphens, underscores", () => {
		const result = parseAnchorMarker(
			"@anchor(file=src/my-module/file_v2.ts, symbol=parse)",
		);
		expect(result).toEqual({
			file: "src/my-module/file_v2.ts",
			symbol: "parse",
		});
	});

	it("treats the marker as data — does not modify content", () => {
		const content = "Auth @anchor(file=auth.ts, symbol=verify) here.";
		parseAnchorMarker(content);
		// The content string is not modified — the marker is pure data
		// extraction, no side effects on the prose.
		expect(content).toBe("Auth @anchor(file=auth.ts, symbol=verify) here.");
	});
});

// ---------------------------------------------------------------------------
// isTsFilePath
// ---------------------------------------------------------------------------

describe("isTsFilePath", () => {
	it("returns true for .ts", () => {
		expect(isTsFilePath("src/auth.ts")).toBe(true);
	});
	it("returns true for .tsx", () => {
		expect(isTsFilePath("src/auth.tsx")).toBe(true);
	});
	it("returns true for .TS (case-insensitive)", () => {
		expect(isTsFilePath("src/auth.TS")).toBe(true);
	});
	it("returns false for .py", () => {
		expect(isTsFilePath("src/auth.py")).toBe(false);
	});
	it("returns false for .json", () => {
		expect(isTsFilePath("src/config.json")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// isSafeAnchorPath — path-traversal security gate
// ---------------------------------------------------------------------------

describe("isSafeAnchorPath", () => {
	it("accepts a repo-relative path", () => {
		expect(isSafeAnchorPath("src/auth.ts", "/project")).toBe(true);
	});

	it("accepts a nested repo-relative path", () => {
		expect(isSafeAnchorPath("src/auth/provider.ts", "/project")).toBe(true);
	});

	it("rejects a parent-directory traversal", () => {
		expect(isSafeAnchorPath("../../etc/passwd", "/project")).toBe(false);
	});

	it("rejects a single-level parent traversal", () => {
		expect(isSafeAnchorPath("../secret.ts", "/project")).toBe(false);
	});

	it("rejects a path that resolves to the root dir itself", () => {
		expect(isSafeAnchorPath(".", "/project")).toBe(false);
	});

	it("accepts an absolute path inside rootDir", () => {
		expect(isSafeAnchorPath("/project/src/auth.ts", "/project")).toBe(true);
	});

	it("rejects an absolute path outside rootDir", () => {
		expect(isSafeAnchorPath("/etc/passwd", "/project")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// parseSymbolPath — serialized symbol path parse-back
// ---------------------------------------------------------------------------

describe("parseSymbolPath", () => {
	it("splits <file>#<symbol> into file and symbol", () => {
		expect(parseSymbolPath("src/auth.ts#verifyJwt")).toEqual({
			file: "src/auth.ts",
			symbol: "verifyJwt",
		});
	});

	it("splits a dotted symbol path", () => {
		expect(parseSymbolPath("src/auth.ts#AuthProvider.verifyJwt")).toEqual({
			file: "src/auth.ts",
			symbol: "AuthProvider.verifyJwt",
		});
	});

	it("returns undefined when no # separator is present", () => {
		expect(parseSymbolPath("src/auth.ts")).toBeUndefined();
	});

	it("returns undefined when # is at the start", () => {
		expect(parseSymbolPath("#verifyJwt")).toBeUndefined();
	});

	it("returns undefined when # is at the end", () => {
		expect(parseSymbolPath("src/auth.ts#")).toBeUndefined();
	});

	it("returns undefined for an empty string", () => {
		expect(parseSymbolPath("")).toBeUndefined();
	});

	it("handles file paths with multiple dots", () => {
		expect(parseSymbolPath("src/auth.provider.v2.ts#verify")).toEqual({
			file: "src/auth.provider.v2.ts",
			symbol: "verify",
		});
	});
});

// ---------------------------------------------------------------------------
// extractSymbolPath — TS Compiler API validation
// ---------------------------------------------------------------------------

describe("extractSymbolPath", () => {
	let rootDir: string;

	const fixtureSource = `
export function verifyJwt(token: string): boolean {
  return true;
}

export class AuthProvider {
  verifyJwt(token: string): boolean {
    return true;
  }

  refreshToken(token: string): string {
    return token;
  }
}

export const MAX_RETRIES = 3;

export interface AuthConfig {
  jwtSecret: string;
  maxRetries: number;
}

export type AuthResult = { success: boolean };

export enum AuthStatus {
  Active,
  Expired,
}

export namespace Auth {
  export function init(): void {}

  export namespace inner {
    export function setup(): void {}
  }
}
`;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "memofs-anchor-symbol-"));
		await writeFile(join(rootDir, "fixture.ts"), fixtureSource, "utf8");
		await writeFile(join(rootDir, "script.py"), "def main(): pass\n", "utf8");
	});

	afterEach(async () => {
		await rm(rootDir, { recursive: true, force: true });
	});

	it("validates a top-level function", async () => {
		const result = await extractSymbolPath({
			file: "fixture.ts",
			symbol: "verifyJwt",
			rootDir,
		});
		expect(result).toBe("fixture.ts#verifyJwt");
	});

	it("validates a class method via dotted path", async () => {
		const result = await extractSymbolPath({
			file: "fixture.ts",
			symbol: "AuthProvider.verifyJwt",
			rootDir,
		});
		expect(result).toBe("fixture.ts#AuthProvider.verifyJwt");
	});

	it("validates a second method on the same class", async () => {
		const result = await extractSymbolPath({
			file: "fixture.ts",
			symbol: "AuthProvider.refreshToken",
			rootDir,
		});
		expect(result).toBe("fixture.ts#AuthProvider.refreshToken");
	});

	it("validates a const variable", async () => {
		const result = await extractSymbolPath({
			file: "fixture.ts",
			symbol: "MAX_RETRIES",
			rootDir,
		});
		expect(result).toBe("fixture.ts#MAX_RETRIES");
	});

	it("validates an interface", async () => {
		const result = await extractSymbolPath({
			file: "fixture.ts",
			symbol: "AuthConfig",
			rootDir,
		});
		expect(result).toBe("fixture.ts#AuthConfig");
	});

	it("validates a type alias", async () => {
		const result = await extractSymbolPath({
			file: "fixture.ts",
			symbol: "AuthResult",
			rootDir,
		});
		expect(result).toBe("fixture.ts#AuthResult");
	});

	it("validates an enum", async () => {
		const result = await extractSymbolPath({
			file: "fixture.ts",
			symbol: "AuthStatus",
			rootDir,
		});
		expect(result).toBe("fixture.ts#AuthStatus");
	});

	it("validates a namespace member", async () => {
		const result = await extractSymbolPath({
			file: "fixture.ts",
			symbol: "Auth.init",
			rootDir,
		});
		expect(result).toBe("fixture.ts#Auth.init");
	});

	it("validates a nested namespace member", async () => {
		const result = await extractSymbolPath({
			file: "fixture.ts",
			symbol: "Auth.inner.setup",
			rootDir,
		});
		expect(result).toBe("fixture.ts#Auth.inner.setup");
	});

	it("returns undefined for a non-existent symbol", async () => {
		const result = await extractSymbolPath({
			file: "fixture.ts",
			symbol: "nonExistent",
			rootDir,
		});
		expect(result).toBeUndefined();
	});

	it("returns undefined when a dotted part does not exist", async () => {
		const result = await extractSymbolPath({
			file: "fixture.ts",
			symbol: "AuthProvider.nonExistent",
			rootDir,
		});
		expect(result).toBeUndefined();
	});

	it("returns undefined for a non-TS file even when symbol is provided", async () => {
		const result = await extractSymbolPath({
			file: "script.py",
			symbol: "main",
			rootDir,
		});
		expect(result).toBeUndefined();
	});

	it("returns undefined when the file does not exist", async () => {
		const result = await extractSymbolPath({
			file: "missing.ts",
			symbol: "foo",
			rootDir,
		});
		expect(result).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// resolveWriteAnchor — the write-path entry point
// ---------------------------------------------------------------------------

describe("resolveWriteAnchor", () => {
	let rootDir: string;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "memofs-resolve-anchor-"));
		await writeFile(
			join(rootDir, "auth.ts"),
			"export function verifyJwt(): boolean { return true; }\n",
			"utf8",
		);
		await writeFile(join(rootDir, "auth.py"), "# original\n", "utf8");
	});

	afterEach(async () => {
		await rm(rootDir, { recursive: true, force: true });
	});

	it("uses the explicit anchor as-is for TS files", async () => {
		const explicit: AnchorRef = {
			file: "auth.ts",
			hash: "a".repeat(64),
			symbol: "auth.ts#verifyJwt",
		};
		const result = await resolveWriteAnchor({
			content: "no marker here",
			explicitAnchor: explicit,
			rootDir,
		});
		expect(result).toEqual(explicit);
	});

	it("strips symbol from explicit anchor for non-TS files", async () => {
		const explicit: AnchorRef = {
			file: "auth.py",
			hash: "b".repeat(64),
			symbol: "auth.py#main",
		};
		const result = await resolveWriteAnchor({
			content: "no marker here",
			explicitAnchor: explicit,
			rootDir,
		});
		expect(result).toEqual({ file: "auth.py", hash: "b".repeat(64) });
		expect(result?.symbol).toBeUndefined();
	});

	it("rejects an explicit anchor with a path-traversal file", async () => {
		const explicit: AnchorRef = {
			file: "../../../etc/passwd",
			hash: "x".repeat(64),
		};
		const result = await resolveWriteAnchor({
			content: "no marker here",
			explicitAnchor: explicit,
			rootDir,
		});
		expect(result).toBeUndefined();
	});

	it("rejects an explicit anchor with an absolute path outside rootDir", async () => {
		const explicit: AnchorRef = {
			file: "/etc/passwd",
			hash: "x".repeat(64),
		};
		const result = await resolveWriteAnchor({
			content: "no marker here",
			explicitAnchor: explicit,
			rootDir,
		});
		expect(result).toBeUndefined();
	});

	it("parses @anchor marker, computes hash, extracts symbol for TS", async () => {
		const content =
			"Auth uses Supabase @anchor(file=auth.ts, symbol=verifyJwt).";
		const result = await resolveWriteAnchor({ content, rootDir });
		expect(result).toBeDefined();
		expect(result?.file).toBe("auth.ts");
		expect(result?.hash).toMatch(/^[0-9a-f]{64}$/);
		expect(result?.symbol).toBe("auth.ts#verifyJwt");
	});

	it("parses @anchor marker, computes hash, leaves symbol undefined for non-TS", async () => {
		const content = "Auth @anchor(file=auth.py, symbol=main).";
		const result = await resolveWriteAnchor({ content, rootDir });
		expect(result).toBeDefined();
		expect(result?.file).toBe("auth.py");
		expect(result?.hash).toMatch(/^[0-9a-f]{64}$/);
		expect(result?.symbol).toBeUndefined();
	});

	it("returns undefined when no marker and no explicit anchor", async () => {
		const result = await resolveWriteAnchor({
			content: "plain content, no marker",
			rootDir,
		});
		expect(result).toBeUndefined();
	});

	it("explicit anchor takes precedence over marker in content", async () => {
		const explicit: AnchorRef = {
			file: "auth.ts",
			hash: "c".repeat(64),
		};
		const content = "@anchor(file=auth.py, symbol=main)";
		const result = await resolveWriteAnchor({
			content,
			explicitAnchor: explicit,
			rootDir,
		});
		expect(result).toEqual(explicit);
	});

	it("returns undefined when marker file does not exist", async () => {
		const content = "@anchor(file=nonexistent.ts, symbol=foo)";
		const result = await resolveWriteAnchor({ content, rootDir });
		expect(result).toBeUndefined();
	});

	it("leaves symbol undefined when TS symbol not found in file", async () => {
		const content = "@anchor(file=auth.ts, symbol=nonExistent)";
		const result = await resolveWriteAnchor({ content, rootDir });
		expect(result).toBeDefined();
		expect(result?.file).toBe("auth.ts");
		expect(result?.hash).toMatch(/^[0-9a-f]{64}$/);
		expect(result?.symbol).toBeUndefined();
	});

	it("parses @anchor(file=…) without symbol — symbol is undefined", async () => {
		const content = "Auth @anchor(file=auth.ts).";
		const result = await resolveWriteAnchor({ content, rootDir });
		expect(result).toBeDefined();
		expect(result?.file).toBe("auth.ts");
		expect(result?.hash).toMatch(/^[0-9a-f]{64}$/);
		expect(result?.symbol).toBeUndefined();
	});

	it("rejects a path-traversal marker — returns undefined", async () => {
		const content = "@anchor(file=../../../etc/passwd, symbol=foo)";
		const result = await resolveWriteAnchor({ content, rootDir });
		expect(result).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// End-to-end write integration through MemoFS.writeMemory
// ---------------------------------------------------------------------------

describe("writeMemory @anchor marker integration", () => {
	let rootDir: string;
	let memo: MemoFS;
	let store: NodeFsMemoryStore;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "memofs-marker-e2e-"));
		store = new NodeFsMemoryStore({ rootDir });
		memo = new MemoFS({ mode: "local", store, rootDir });
	});

	afterEach(async () => {
		await store.dispose();
		await rm(rootDir, { recursive: true, force: true });
	});

	it("round-trips @anchor marker through recall with AnchorRef.symbol populated for TS", async () => {
		// Write a TS fixture file.
		await writeFile(
			join(rootDir, "auth.ts"),
			"export function verifyJwt(): boolean { return true; }\n",
			"utf8",
		);

		// Write a memory with an @anchor marker in content.
		const content =
			"Auth uses Supabase with custom JWT validation @anchor(file=auth.ts, symbol=verifyJwt).";
		const result = await memo.writeMemory({
			content,
			title: "Auth via Supabase",
			kind: "decision",
		});
		expect(result.id).toMatch(/^mem_/);

		// Recall the memory and verify the anchor was persisted.
		const recall = await memo.recall("Auth Supabase", { limit: 5 });
		const hit = recall.items.find((i) => i.id === result.id);
		expect(hit).toBeDefined();
		expect(hit?.anchor).toBeDefined();
		expect(hit?.anchor?.file).toBe("auth.ts");
		expect(hit?.anchor?.hash).toMatch(/^[0-9a-f]{64}$/);
		expect(hit?.anchor?.symbol).toBe("auth.ts#verifyJwt");
		expect(hit?.stale).toBeUndefined();
	});

	it("round-trips @anchor marker for non-TS with symbol undefined but file+hash drift-protects", async () => {
		await writeFile(join(rootDir, "auth.py"), "# original\n", "utf8");

		const content = "Auth uses Supabase @anchor(file=auth.py, symbol=main).";
		const result = await memo.writeMemory({
			content,
			title: "Auth via Supabase",
			kind: "decision",
		});

		const recall = await memo.recall("Auth Supabase", { limit: 5 });
		const hit = recall.items.find((i) => i.id === result.id);
		expect(hit).toBeDefined();
		expect(hit?.anchor).toBeDefined();
		expect(hit?.anchor?.file).toBe("auth.py");
		expect(hit?.anchor?.hash).toMatch(/^[0-9a-f]{64}$/);
		// Non-TS: symbol is undefined even though the marker had one.
		expect(hit?.anchor?.symbol).toBeUndefined();
	});

	it("writes without anchor when no marker and no explicit anchor", async () => {
		const result = await memo.writeMemory({
			content: "Just a normal memory with no anchor marker.",
			title: "Normal",
		});

		const recall = await memo.recall("Normal", { limit: 5 });
		const hit = recall.items.find((i) => i.id === result.id);
		expect(hit).toBeDefined();
		expect(hit?.anchor).toBeUndefined();
		expect(hit?.stale).toBeUndefined();
	});

	it("drift-detects @anchor-marked TS file when bytes change", async () => {
		await writeFile(
			join(rootDir, "auth.ts"),
			"export function verifyJwt(): boolean { return true; }\n",
			"utf8",
		);

		const content =
			"Auth uses Supabase @anchor(file=auth.ts, symbol=verifyJwt).";
		const result = await memo.writeMemory({ content, kind: "decision" });

		// Clean recall — no drift yet.
		const clean = await memo.recall("Auth Supabase", { limit: 5 });
		const cleanHit = clean.items.find((i) => i.id === result.id);
		expect(cleanHit?.stale).toBeUndefined();

		// Mutate the file — drift.
		await writeFile(
			join(rootDir, "auth.ts"),
			"export function verifyJwt(): boolean { return false; }\n",
			"utf8",
		);

		const drifted = await memo.recall("Auth Supabase", { limit: 5 });
		const driftedHit = drifted.items.find((i) => i.id === result.id);
		expect(driftedHit?.stale).toBe(true);
		expect(driftedHit?.anchor?.file).toBe("auth.ts");
	});

	it("non-TS file with @anchor(file=…) (no symbol) — symbol undefined, file+hash drift-protects", async () => {
		await writeFile(
			join(rootDir, "config.json"),
			JSON.stringify({ port: 3000 }),
			"utf8",
		);

		const content = "App config @anchor(file=config.json).";
		const result = await memo.writeMemory({ content, kind: "reference" });

		const recall = await memo.recall("App config", { limit: 5 });
		const hit = recall.items.find((i) => i.id === result.id);
		expect(hit).toBeDefined();
		expect(hit?.anchor).toBeDefined();
		expect(hit?.anchor?.file).toBe("config.json");
		expect(hit?.anchor?.hash).toMatch(/^[0-9a-f]{64}$/);
		expect(hit?.anchor?.symbol).toBeUndefined();
	});
});
