import { describe, expect, it } from "vitest";
import {
	callTekMemoTool,
	createTekMemoMcpRuntimeFromConfig,
	type WriteMemoryInput,
} from "../src/index";

describe("Security", () => {
	it("metadata rejects prototype pollution keys", async () => {
		const result = await callTekMemoTool(
			{ runtime: createTekMemoMcpRuntimeFromConfig({ mode: "memory" }) },
			"tekmemo.remember",
			{
				content: "hello",
				metadata: JSON.parse('{"__proto__":{"polluted":true}}'),
			},
		);
		expect(result.isError).toBe(true);
		const text =
			result.content[0]?.type === "text" ? result.content[0]?.text : "";
		expect(text).toMatch(/unsafe key/);
	});

	it("oversized input is rejected before runtime execution", async () => {
		let called = false;
		const runtime = createTekMemoMcpRuntimeFromConfig({ mode: "memory" });
		const wrapped = {
			...runtime,
			async writeMemory(input: WriteMemoryInput, signal?: AbortSignal) {
				called = true;
				return runtime.writeMemory(input, signal);
			},
		};
		const result = await callTekMemoTool(
			{ runtime: wrapped, maxInputBytes: 100 },
			"tekmemo.remember",
			{ content: "x".repeat(1000) },
		);
		expect(result.isError).toBe(true);
		expect(called).toBe(false);
	});

	it("runtime timeouts are converted into tool-level errors", async () => {
		const runtime = createTekMemoMcpRuntimeFromConfig({ mode: "memory" });
		const slow = {
			...runtime,
			async health(signal?: AbortSignal) {
				await new Promise((resolve) => setTimeout(resolve, 50));
				return runtime.health(signal);
			},
		};
		const result = await callTekMemoTool(
			{ runtime: slow, requestTimeoutMs: 1 },
			"tekmemo.health",
			{},
		);
		expect(result.isError).toBe(true);
		const text =
			result.content[0]?.type === "text" ? result.content[0]?.text : "";
		expect(text).toMatch(/MCP_TIMEOUT/);
	});
});
