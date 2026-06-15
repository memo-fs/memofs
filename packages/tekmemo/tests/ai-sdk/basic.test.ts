import {
	bootstrapMemoryStore,
	InMemoryMemoryStore,
	writeCoreMemory,
} from "@tekbreed/tekmemo";
import { expect, test } from "vitest";

import { buildPrepareCallMemoryText } from "../../src/index";

test("buildPrepareCallMemoryText includes workspace core memory", async () => {
	const store = new InMemoryMemoryStore();
	await bootstrapMemoryStore(store);

	await writeCoreMemory(
		store,
		`# Core Memory\n\n## Identity\n- Project: Test\n`,
	);

	const text = await buildPrepareCallMemoryText({
		baseInstructions: "You are a helpful agent.",
		retrievalPlan: {
			allowedScopes: ["workspace"],
			readUserMemory: false,
			readArchivalMemory: false,
			includeRecall: true,
			precedence: ["workspace"],
		},
		stores: {
			workspace: store,
		},
	});

	expect(text).toMatch(/You are a helpful agent\./);
	expect(text).toMatch(/Workspace Memory/);
	expect(text).toMatch(/Project: Test/);
});
