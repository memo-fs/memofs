import { describe, expect, it } from "vitest";
import { createInMemoryTekMemoServer } from "../src/index.js";

describe("createInMemoryTekMemoServer", () => {
	it("serves the TekMemo Cloud-compatible memory endpoints", async () => {
		const app = createInMemoryTekMemoServer({ apiKeys: ["tk_test"] });

		const create = await app.request("/api/v1/projects/default/memory/notes", {
			method: "POST",
			headers: {
				authorization: "Bearer tk_test",
				"content-type": "application/json",
			},
			body: JSON.stringify({ content: "Use Hono for the self-host server." }),
		});
		expect(create.status).toBe(201);

		const recall = await app.request("/api/v1/projects/default/recall/query", {
			method: "POST",
			headers: {
				authorization: "Bearer tk_test",
				"content-type": "application/json",
			},
			body: JSON.stringify({ query: "Hono" }),
		});
		const body = await recall.json();
		expect(recall.status).toBe(200);
		expect(body.data.hits).toHaveLength(1);
	});

	it("serves AgentFS session control-plane endpoints", async () => {
		const app = createInMemoryTekMemoServer({ apiKeys: ["tk_test"] });
		const headers = {
			authorization: "Bearer tk_test",
			"content-type": "application/json",
		};

		const create = await app.request(
			"/api/v1/projects/default/agent-sessions",
			{
				method: "POST",
				headers,
				body: JSON.stringify({
					sessionId: "session_test",
					task: "Wire AgentFS session APIs",
					workspaceProvider: "agentfs",
					workspaceRoot: "/agent-sessions/session_test",
				}),
			},
		);
		expect(create.status).toBe(201);

		const extract = await app.request(
			"/api/v1/projects/default/agent-sessions/session_test/extract",
			{
				method: "POST",
				headers,
				body: JSON.stringify({
					summary: "Done.",
					durableMemory: "Agent session memory requires approval.",
				}),
			},
		);
		const extractionBody = await extract.json();
		expect(extract.status).toBe(201);
		expect(extractionBody.data.approvalStatus).toBe("pending");

		const approve = await app.request(
			"/api/v1/projects/default/agent-sessions/session_test/approve-memory",
			{
				method: "POST",
				headers,
				body: JSON.stringify({
					extractionId: extractionBody.data.id,
					kind: "decision",
				}),
			},
		);
		expect(approve.status).toBe(200);

		const complete = await app.request(
			"/api/v1/projects/default/agent-sessions/session_test/complete",
			{
				method: "POST",
				headers,
				body: JSON.stringify({ status: "completed" }),
			},
		);
		const completeBody = await complete.json();
		expect(complete.status).toBe(200);
		expect(completeBody.data.status).toBe("completed");
	});
});
