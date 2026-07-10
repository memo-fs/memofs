import { describe, expect, it } from "vitest";
import { InMemoryMemoryStore } from "@memofs/core";
import {
	callMemoFSTool,
	createMemoFSMcpRuntimeFromConfig,
	type WriteMemoryInput,
} from "../src/index";

describe("Security", () => {
	it("metadata rejects prototype pollution keys", async () => {
		const result = await callMemoFSTool(
			{ runtime: createMemoFSMcpRuntimeFromConfig({ mode: "local", store: new InMemoryMemoryStore() }) },
			"memofs.remember",
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
		const runtime = createMemoFSMcpRuntimeFromConfig({ mode: "local", store: new InMemoryMemoryStore() });
		const wrapped = {
			...runtime,
			async writeMemory(input: WriteMemoryInput, signal?: AbortSignal) {
				called = true;
				// The local factory always wires `writeMemory`; the non-null
				// assertion preserves the `WriteMemoryResult` (non-optional)
				// return type the runtime contract requires.
				// biome-ignore lint/style/noNonNullAssertion: local factory always wires writeMemory
				return runtime.writeMemory!(input, signal);
			},
		};
		const result = await callMemoFSTool(
			{ runtime: wrapped, maxInputBytes: 100 },
			"memofs.remember",
			{ content: "x".repeat(1000) },
		);
		expect(result.isError).toBe(true);
		expect(called).toBe(false);
	});

	it("runtime timeouts are converted into tool-level errors", async () => {
		const runtime = createMemoFSMcpRuntimeFromConfig({ mode: "local", store: new InMemoryMemoryStore() });
		// memofs.health was demoted to a runtime method,
		// so exercise the timeout path through memofs.recall — a surviving read
		// verb. The wrapped recall stalls past the 1ms deadline.
		const slow = {
			...runtime,
			async recall(input: unknown, signal?: AbortSignal) {
				await new Promise((resolve) => setTimeout(resolve, 50));
				// biome-ignore lint/style/noNonNullAssertion: local factory always wires recall
				return runtime.recall!(input as never, signal);
			},
		};
		const result = await callMemoFSTool(
			{ runtime: slow, requestTimeoutMs: 1 },
			"memofs.recall",
			{ query: "slow" },
		);
		expect(result.isError).toBe(true);
		const text =
			result.content[0]?.type === "text" ? result.content[0]?.text : "";
		expect(text).toMatch(/MCP_TIMEOUT/);
	});
});
