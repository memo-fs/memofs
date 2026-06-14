import { describe, expect, it } from "vitest";
import {
	createDefaultManifest,
	parseManifest,
	validateManifest,
} from "../src/protocol/manifest";

describe("createDefaultManifest", () => {
	it("creates a manifest with random project ID", () => {
		const manifest = createDefaultManifest();
		expect(manifest.projectId).toMatch(/^proj_/);
		expect(manifest.version).toBe("1");
		expect(manifest.memory.core).toContain("core.md");
	});

	it("uses provided project ID", () => {
		const manifest = createDefaultManifest({ projectId: "my-proj" });
		expect(manifest.projectId).toBe("my-proj");
	});

	it("uses provided timestamp", () => {
		const manifest = createDefaultManifest({ now: "2026-01-01T00:00:00.000Z" });
		expect(manifest.createdAt).toBe("2026-01-01T00:00:00.000Z");
	});
});

describe("parseManifest", () => {
	it("parses valid JSON", () => {
		const manifest = createDefaultManifest();
		const json = JSON.stringify(manifest);
		const parsed = parseManifest(json);
		expect(parsed.projectId).toBe(manifest.projectId);
	});

	it("throws on invalid JSON", () => {
		expect(() => parseManifest("{bad")).toThrow();
	});
});

describe("validateManifest", () => {
	it("accepts a valid manifest", () => {
		const manifest = createDefaultManifest();
		expect(() => validateManifest(manifest)).not.toThrow();
	});

	it("rejects non-object", () => {
		expect(() => validateManifest(null)).toThrow();
		expect(() => validateManifest("string")).toThrow();
		expect(() => validateManifest([])).toThrow();
	});

	it("rejects missing version", () => {
		const manifest = createDefaultManifest();
		const { version: _, ...rest } = manifest;
		expect(() => validateManifest(rest)).toThrow();
	});

	it("rejects empty strings", () => {
		const manifest = createDefaultManifest();
		expect(() => validateManifest({ ...manifest, version: "" })).toThrow();
	});

	it("rejects null bytes in string fields", () => {
		const manifest = createDefaultManifest();
		expect(() =>
			validateManifest({ ...manifest, projectId: "bad\0id" }),
		).toThrow();
	});

	it("rejects invalid ISO dates", () => {
		const manifest = createDefaultManifest();
		expect(() =>
			validateManifest({ ...manifest, createdAt: "not-a-date" }),
		).toThrow();
	});
});
