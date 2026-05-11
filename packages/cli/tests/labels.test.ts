import { describe, expect, it } from "vitest";
import { validateSnapshotLabel } from "../src/utils/labels";

describe("validateSnapshotLabel", () => {
	it("accepts valid labels", () => {
		expect(validateSnapshotLabel("before-refactor")).toBe("before-refactor");
		expect(validateSnapshotLabel("v1.0")).toBe("v1.0");
		expect(() => validateSnapshotLabel("release:prod")).toThrow();
	});

	it("rejects empty labels", () => {
		expect(() => validateSnapshotLabel("")).toThrow();
		expect(() => validateSnapshotLabel("   ")).toThrow();
	});

	it("rejects labels with path separators", () => {
		expect(() => validateSnapshotLabel("bad/path")).toThrow();
		expect(() => validateSnapshotLabel("bad\\path")).toThrow();
	});

	it("rejects path traversal", () => {
		expect(() => validateSnapshotLabel("..")).toThrow();
		expect(() => validateSnapshotLabel("foo/../bar")).toThrow();
	});

	it("rejects null bytes", () => {
		expect(() => validateSnapshotLabel("bad\0label")).toThrow();
	});

	it("rejects labels over 80 characters", () => {
		const longLabel = "a".repeat(81);
		expect(() => validateSnapshotLabel(longLabel)).toThrow();
	});

	it("accepts labels up to 80 characters", () => {
		const label = "a".repeat(80);
		expect(validateSnapshotLabel(label)).toBe(label);
	});
});
