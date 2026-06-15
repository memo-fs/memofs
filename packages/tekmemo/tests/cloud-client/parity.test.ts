import { describe, expect, it } from "vitest";
import { createTekMemoCloudClient } from "../../src/cloud-client";

describe("Cloud Client Parity", () => {
	it("should expose all required namespaces from the Cloud route manifest", () => {
		const client = createTekMemoCloudClient({
			baseUrl: "http://localhost",
			apiKey: "test",
		});

		// Core memory and basic namespaces
		expect(client.memory).toBeDefined();
		expect(client.recall).toBeDefined();
		expect(client.context).toBeDefined();
		expect(client.graph).toBeDefined();
		expect(client.sync).toBeDefined();

		// Advanced namespaces mentioned in the OSS-Cloud API Alignment Report
		expect(client.candidates).toBeDefined();
		expect(client.conflicts).toBeDefined();
		expect(client.providers).toBeDefined();
		expect(client.agentSessions).toBeDefined();
		expect(client.exports).toBeDefined();
		expect(client.snapshots).toBeDefined();
		expect(client.extraction).toBeDefined();
		expect(client.evals).toBeDefined();
		expect(client.benchmarks).toBeDefined();

		// Check some specific methods to ensure they exist on the namespaces
		expect(typeof client.candidates.list).toBe("function");
		expect(typeof client.candidates.create).toBe("function");
		expect(typeof client.candidates.promote).toBe("function");
		expect(typeof client.candidates.dismiss).toBe("function");

		expect(typeof client.conflicts.list).toBe("function");
		expect(typeof client.conflicts.resolve).toBe("function");

		expect(typeof client.providers.update).toBe("function");
		expect(typeof client.providers.delete).toBe("function");

		expect(typeof client.agentSessions.list).toBe("function");
		expect(typeof client.agentSessions.get).toBe("function");
	});
});
