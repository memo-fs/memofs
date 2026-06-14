import { TEKMEMO_PATHS } from "@tekbreed/tekmemo";
import { describe, expect, test } from "vitest";
import { AgentfsMemoryStore } from "../../src/index";
import { InMemoryAgentfsClient } from "./test-utils";

describe("same-instance append serialization", () => {
	test("serializes fallback read/write appends to the same path", async () => {
		const client = new InMemoryAgentfsClient({ nativeAppend: false });
		client.readDelayMs = 2;
		client.writeDelayMs = 2;
		const store = new AgentfsMemoryStore(client, {
			scope: "project",
			projectId: "proj_123",
		});

		await Promise.all(
			Array.from({ length: 20 }, (_, index) =>
				store.append(TEKMEMO_PATHS.events.memoryEvents, `${index}\n`),
			),
		);

		const lines = (await store.read(TEKMEMO_PATHS.events.memoryEvents))
			.trim()
			.split("\n");
		expect(lines).toHaveLength(20);
		expect(new Set(lines).size).toBe(20);
	});
});
