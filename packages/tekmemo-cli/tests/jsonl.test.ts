import { describe, expect, it } from "vitest";
import { parseJsonl, stringifyJsonl } from "../src/protocol/jsonl";

describe("parseJsonl", () => {
	it("parses valid JSONL", () => {
		const content = '{"a":1}\n{"b":2}\n';
		const records = parseJsonl(content);
		expect(records).toHaveLength(2);
		expect(records[0]?.value).toEqual({ a: 1 });
		expect(records[1]?.value).toEqual({ b: 2 });
	});

	it("skips empty lines", () => {
		const content = '{"a":1}\n\n{"b":2}\n';
		const records = parseJsonl(content);
		expect(records).toHaveLength(2);
	});

	it("tracks line numbers", () => {
		const content = '{"a":1}\n\n{"b":2}\n';
		const records = parseJsonl(content);
		expect(records[0]?.line).toBe(1);
		expect(records[1]?.line).toBe(3);
	});

	it("skips invalid JSON in relaxed mode", () => {
		const content = '{"a":1}\nbad\n{"b":2}\n';
		const records = parseJsonl(content, { strict: false });
		expect(records).toHaveLength(2);
	});

	it("throws on invalid JSON in strict mode", () => {
		const content = '{"a":1}\nbad\n';
		expect(() => parseJsonl(content, { strict: true })).toThrow();
	});

	it("throws on non-object JSON in strict mode", () => {
		const content = "[1,2]\n";
		expect(() => parseJsonl(content, { strict: true })).toThrow();
	});

	it("skips non-object JSON in relaxed mode", () => {
		const content = '42\n"hello"\n[1,2]\n{"ok":true}\n';
		const records = parseJsonl(content, { strict: false });
		expect(records).toHaveLength(1);
		expect(records[0]?.value).toEqual({ ok: true });
	});

	it("returns empty array for empty string", () => {
		expect(parseJsonl("")).toHaveLength(0);
	});
});

describe("stringifyJsonl", () => {
	it("stringifies records", () => {
		const result = stringifyJsonl([{ a: 1 }, { b: 2 }]);
		expect(result).toBe('{"a":1}\n{"b":2}\n');
	});

	it("returns empty string for empty array", () => {
		expect(stringifyJsonl([])).toBe("");
	});
});
