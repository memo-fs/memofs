import { describe, expect, it } from "vitest";
import {
	GraphParseError,
	parseGraphEdgesJsonl,
	parseGraphNodesJsonl,
	parseGraphNodesJsonlDetailed,
	serializeGraphEdgesJsonl,
	serializeGraphNodesJsonl,
} from "../../src/index";
import { edge, node } from "./fixtures";

describe("jsonl", () => {
	it("serializes and parses graph node JSONL", () => {
		const jsonl = serializeGraphNodesJsonl([node()]);
		const rows = parseGraphNodesJsonl(jsonl);
		expect(rows.length).toBe(1);
		expect(rows[0]?.id).toBe("project:memofs");
	});

	it("serializes and parses graph edge JSONL", () => {
		const jsonl = serializeGraphEdgesJsonl([edge()]);
		const rows = parseGraphEdgesJsonl(jsonl);
		expect(rows.length).toBe(1);
		expect(rows[0]?.from).toBe("project:memofs");
	});

	it("throws on malformed JSONL by default", () => {
		expect(() => parseGraphNodesJsonl("{bad json}\n")).toThrow(GraphParseError);
	});

	it("can skip malformed JSONL lines and report issues", () => {
		const result = parseGraphNodesJsonlDetailed(
			`${JSON.stringify(node())}\n{bad}\n`,
			{ onInvalidLine: "skip" },
		);
		expect(result.rows.length).toBe(1);
		expect(result.issues.length).toBe(1);
		expect(result.issues[0]?.line).toBe(2);
	});
});
