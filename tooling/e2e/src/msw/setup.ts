/**
 * MSW setup for vitest e2e config — starts/stops the server per test file.
 *
 * @remarks
 * - `beforeAll` listen with onUnhandledRequest:"bypass" (allow core/cli/mcp traffic)
 * - `afterEach` resetHandlers (clears runtime overrides like setGitHubNodes)
 * - `afterAll` close
 *
 * Fixtures are sanitized: RUN_ID and secretRedacted test-token-***.
 */

import { afterAll, afterEach, beforeAll } from "vitest";

import { mswServer } from "./server.js";

beforeAll(() => {
	mswServer.listen({
		onUnhandledRequest: "bypass",
	});
});

afterEach(async () => {
	mswServer.resetHandlers();
	// Reset mutable fixture overrides so each test starts clean
	try {
		const [github, notion, openai, voyage] = await Promise.all([
			import("./handlers/github.js"),
			import("./handlers/notion.js"),
			import("./handlers/openai.js"),
			import("./handlers/voyage.js"),
		]);
		github.resetGitHubFixture();
		notion.resetNotionFixture();
		openai.resetOpenAIFixture();
		voyage.resetVoyageFixture();
	} catch {
		// ignore reset failures — handlers may not exist yet
	}
});

afterAll(() => {
	mswServer.close();
});
