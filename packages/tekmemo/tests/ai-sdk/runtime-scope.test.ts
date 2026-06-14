import { expect, test } from "vitest";
import {
	buildRuntimeMemoryContext,
	buildRuntimeMemoryToolDefinition,
	canReadMemoryMetadata,
	createRecallFilters,
	createScopeMetadata,
	normalizeAccessContext,
	type TekMemoAiRuntime,
} from "../../src/index";

function createFakeRuntime(): TekMemoAiRuntime & {
	notes: unknown[];
	recallInput?: unknown;
} {
	const notes: unknown[] = [];
	return {
		notes,
		async readCoreMemory() {
			return { content: "# Core Memory\n\n- Project policy is shared." };
		},
		async updateCoreMemory(input) {
			return { content: input.content };
		},
		async listNotes() {
			return { items: notes };
		},
		async createNote(input) {
			const note = {
				id: `note_${notes.length + 1}`,
				kind: input.kind ?? "note",
				content: input.content,
				metadata: input.metadata,
			};
			notes.push(note);
			return note;
		},
		async recall(input) {
			this.recallInput = input;
			return {
				items: [
					{
						id: "project",
						text: "shared project hit",
						metadata: { scope: "project", visibility: "system" },
					},
					{
						id: "same-user",
						text: "same user hit",
						metadata: {
							scope: "user",
							visibility: "private",
							userId: "user_a",
						},
					},
					{
						id: "other-user",
						text: "other user hit",
						metadata: {
							scope: "user",
							visibility: "private",
							userId: "user_b",
						},
					},
				],
			};
		},
	};
}

test("normalizes safe scope defaults from access context", () => {
	const context = normalizeAccessContext({
		projectId: "proj_1",
		userId: "user_a",
		conversationId: "conv_1",
		participantIds: ["user_a", "user_b", "user_a"],
	});

	expect(context.allowedScopes).toContain("project");
	expect(context.allowedScopes).toContain("user");
	expect(context.allowedScopes).toContain("conversation");
	expect(context.allowedScopes).toContain("participant-shared");
	expect(context.participantIds).toEqual(["user_a", "user_b"]);
});

test("scope metadata stores private user memory without leaking participant memory", () => {
	const context = normalizeAccessContext({
		projectId: "proj",
		userId: "user_a",
	});
	const metadata = createScopeMetadata({ context, scope: "user" });
	expect(metadata.scope).toBe("user");
	expect(metadata.visibility).toBe("private");
	expect(metadata.userId).toBe("user_a");
	expect(
		canReadMemoryMetadata(metadata, { projectId: "proj", userId: "user_a" }),
	).toBe(true);
	expect(
		canReadMemoryMetadata(metadata, { projectId: "proj", userId: "user_b" }),
	).toBe(false);
});

test("recall filters include only authorized scope identifiers", () => {
	const filters = createRecallFilters({
		projectId: "proj",
		userId: "user_a",
		conversationId: "conv",
		participantIds: ["user_a", "user_b"],
	});
	expect(filters.projectId).toBe("proj");
	expect(filters.userId).toBe("user_a");
	expect(filters.conversationId).toBe("conv");
	expect(filters.scopes).toContain("user");
	expect(filters.scopes).toContain("conversation");
});

test("runtime tool remember writes scoped metadata", async () => {
	const runtime = createFakeRuntime();
	const tool = buildRuntimeMemoryToolDefinition({
		runtime,
		access: { projectId: "proj", userId: "user_a" },
		allowWrites: true,
	});

	await tool.execute({
		command: "remember",
		content: "User prefers concise answers.",
		scope: "user",
		kind: "preference",
	});

	expect(runtime.notes[0].metadata.scope).toBe("user");
	expect(runtime.notes[0].metadata.userId).toBe("user_a");
});

test("runtime tool blocks likely secrets by default", async () => {
	const runtime = createFakeRuntime();
	const tool = buildRuntimeMemoryToolDefinition({
		runtime,
		access: { projectId: "proj", userId: "user_a" },
		allowWrites: true,
	});

	await expect(
		tool.execute({
			command: "remember",
			content: "TEKMEMO_API_KEY=tk_live_secret123456789",
		}),
	).rejects.toThrow(/Potential secret/);
});

test("buildRuntimeMemoryContext filters other users private recall", async () => {
	const runtime = createFakeRuntime();
	const result = await buildRuntimeMemoryContext({
		runtime,
		access: { projectId: "proj", userId: "user_a" },
		query: "preferences",
	});

	expect(result.text).toContain("shared project hit");
	expect(result.text).toContain("same user hit");
	expect(result.text).not.toContain("other user hit");
});
