/**
 * MSW server — deterministic network proof for connectors + remote adapters.
 *
 * @remarks
 * - `setupServer(...handlers)` from `msw/node`
 * - Handlers intercept api.github.com, api.notion.com, api.openai.com, api.voyageai.com
 * - Returns sanitized recorded fixtures (RUN_ID style, secret redacted to test-token-***)
 * - Vitest lifecycle in `setup.ts`: beforeAll listen, afterEach resetHandlers, afterAll close
 */

import { setupServer } from "msw/node";

import { githubHandlers } from "./handlers/github.js";
import { notionHandlers } from "./handlers/notion.js";
import { openaiHandlers } from "./handlers/openai.js";
import { voyageHandlers } from "./handlers/voyage.js";

/** All MSW handlers combined — GitHub, Notion, OpenAI, Voyage. */
export const allHandlers = [
	...githubHandlers,
	...notionHandlers,
	...openaiHandlers,
	...voyageHandlers,
];

/**
 * The MSW server instance used in e2e tests.
 *
 * Start via `mswServer.listen({ onUnhandledRequest: "bypass" })` to allow
 * non-mocked requests (core, cli, etc.) to pass through.
 */
export const mswServer = setupServer(...allHandlers);

/** For backwards compatibility / debugging — alias of allHandlers. */
export const restHandlers = allHandlers;
