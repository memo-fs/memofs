import { describe, expect, test } from "vitest";
import {
	AgentfsSyncError,
	AgentfsValidationError,
	checkpointStore,
	syncAfterSession,
	syncBeforeSession,
	validateCheckpointLabel,
} from "../../src/index";
import { InMemoryAgentfsClient } from "./test-utils";

describe("sync hooks", () => {
	test("syncBeforeSession calls pull when available", async () => {
		const calls: string[] = [];
		const client = new InMemoryAgentfsClient({
			sync: {
				pull: async () => {
					calls.push("pull");
				},
			},
		});

		await expect(syncBeforeSession(client)).resolves.toEqual({
			operation: "pull",
			skipped: false,
		});
		expect(calls).toEqual(["pull"]);
	});

	test("syncBeforeSession is no-op when sync missing unless required", async () => {
		const client = new InMemoryAgentfsClient();

		await expect(syncBeforeSession(client)).resolves.toEqual({
			operation: "pull",
			skipped: true,
		});
		await expect(
			syncBeforeSession(client, { requireSync: true }),
		).rejects.toThrow(AgentfsSyncError);
	});

	test("checkpointStore calls checkpoint and validates label", async () => {
		const calls: string[] = [];
		const client = new InMemoryAgentfsClient({
			sync: {
				checkpoint: async (label: string) => {
					calls.push(`checkpoint:${label}`);
				},
			},
		});

		await expect(checkpointStore(client, "  after-session  ")).resolves.toEqual(
			{
				operation: "checkpoint",
				skipped: false,
				label: "after-session",
			},
		);
		expect(calls).toEqual(["checkpoint:after-session"]);
	});

	test("checkpointStore is no-op if checkpoint is not available", async () => {
		const client = new InMemoryAgentfsClient();

		await expect(checkpointStore(client, "memory-update")).resolves.toEqual({
			operation: "checkpoint",
			skipped: true,
			label: "memory-update",
		});
	});

	test("syncAfterSession checkpoints before pushing", async () => {
		const calls: string[] = [];
		const client = new InMemoryAgentfsClient({
			sync: {
				checkpoint: async (label: string) => {
					calls.push(`checkpoint:${label}`);
				},
				push: async () => {
					calls.push("push");
				},
			},
		});

		await expect(syncAfterSession(client, "after-session")).resolves.toEqual({
			checkpoint: {
				operation: "checkpoint",
				skipped: false,
				label: "after-session",
			},
			push: { operation: "push", skipped: false },
		});
		expect(calls).toEqual(["checkpoint:after-session", "push"]);
	});

	test("syncAfterSession can skip checkpoint", async () => {
		const calls: string[] = [];
		const client = new InMemoryAgentfsClient({
			sync: {
				checkpoint: async () => {
					calls.push("checkpoint");
				},
				push: async () => {
					calls.push("push");
				},
			},
		});

		await syncAfterSession(client, { checkpointBeforePush: false });
		expect(calls).toEqual(["push"]);
	});

	test("syncAfterSession is no-op when push missing unless required", async () => {
		const client = new InMemoryAgentfsClient();

		await expect(syncAfterSession(client)).resolves.toMatchObject({
			push: { operation: "push", skipped: true },
		});
		await expect(
			syncAfterSession(client, { requireSync: true }),
		).rejects.toThrow(AgentfsSyncError);
	});

	test("sync errors are wrapped", async () => {
		const pullClient = new InMemoryAgentfsClient({
			sync: {
				pull: async () => {
					throw new Error("pull failed");
				},
			},
		});
		await expect(syncBeforeSession(pullClient)).rejects.toThrow(
			AgentfsSyncError,
		);

		const checkpointClient = new InMemoryAgentfsClient({
			sync: {
				checkpoint: async () => {
					throw new Error("checkpoint failed");
				},
			},
		});
		await expect(checkpointStore(checkpointClient, "label")).rejects.toThrow(
			AgentfsSyncError,
		);

		const pushClient = new InMemoryAgentfsClient({
			sync: {
				push: async () => {
					throw new Error("push failed");
				},
			},
		});
		await expect(
			syncAfterSession(pushClient, { checkpointBeforePush: false }),
		).rejects.toThrow(AgentfsSyncError);
	});
});

describe("validateCheckpointLabel", () => {
	test("normalizes labels", () => {
		expect(validateCheckpointLabel(" label ")).toBe("label");
	});

	test("rejects invalid labels", () => {
		expect(() => validateCheckpointLabel(1)).toThrow(AgentfsValidationError);
		expect(() => validateCheckpointLabel("")).toThrow(AgentfsValidationError);
		expect(() => validateCheckpointLabel("a\nb")).toThrow(
			AgentfsValidationError,
		);
		expect(() => validateCheckpointLabel("x".repeat(129))).toThrow(
			AgentfsValidationError,
		);
	});
});
