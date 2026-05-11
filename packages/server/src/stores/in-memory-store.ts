import type {
	MemoryKind,
	TekMemoServerAgentSession,
	TekMemoServerAgentSessionEvent,
	TekMemoServerAgentSessionExtraction,
	TekMemoServerCoreMemory,
	TekMemoServerMemoryNote,
	TekMemoServerPage,
	TekMemoServerProject,
	TekMemoServerRecallHit,
	TekMemoServerStore,
} from "../types.js";

interface ProjectState {
	project: TekMemoServerProject;
	core: TekMemoServerCoreMemory;
	notes: TekMemoServerMemoryNote[];
	agentSessions: TekMemoServerAgentSession[];
	agentSessionEvents: TekMemoServerAgentSessionEvent[];
	agentSessionExtractions: TekMemoServerAgentSessionExtraction[];
}

export interface CreateInMemoryTekMemoStoreOptions {
	defaultProjectId?: string;
	defaultCoreMemory?: string;
}

export function createInMemoryTekMemoStore(
	options: CreateInMemoryTekMemoStoreOptions = {},
): TekMemoServerStore {
	const projects = new Map<string, ProjectState>();
	const defaultProjectId = options.defaultProjectId ?? "default";

	const ensure = (projectId: string, name = projectId): ProjectState => {
		const existing = projects.get(projectId);
		if (existing) return existing;
		const now = new Date().toISOString();
		const state: ProjectState = {
			project: { id: projectId, name, createdAt: now, updatedAt: now },
			core: {
				content:
					options.defaultCoreMemory ??
					`# Core Memory

No memory has been written yet.
`,
				updatedAt: now,
				version: 1,
			},
			notes: [],
			agentSessions: [],
			agentSessionEvents: [],
			agentSessionExtractions: [],
		};
		projects.set(projectId, state);
		return state;
	};

	ensure(defaultProjectId, "Default");

	return {
		async isReady() {
			return true;
		},
		async listProjects() {
			return [...projects.values()].map((state) => state.project);
		},
		async ensureProject(input) {
			return ensure(input.projectId, input.name).project;
		},
		async readCore(projectId) {
			return ensure(projectId).core;
		},
		async updateCore(input) {
			const state = ensure(input.projectId);
			const now = new Date().toISOString();
			state.core = {
				content: input.content,
				updatedAt: now,
				version: (state.core.version ?? 0) + 1,
			};
			state.project.updatedAt = now;
			return state.core;
		},
		async listNotes(input) {
			const state = ensure(input.projectId);
			const offset = input.cursor ? Number(input.cursor) : 0;
			const limit = input.limit ?? 50;
			let notes = state.notes;
			if (input.kind) notes = notes.filter((note) => note.kind === input.kind);
			if (input.tag) {
				const tag = input.tag;
				notes = notes.filter((note) => note.tags?.includes(tag));
			}
			const items = notes.slice(offset, offset + limit);
			const nextOffset = offset + items.length;
			const page: TekMemoServerPage<TekMemoServerMemoryNote> = { items };
			if (nextOffset < notes.length) page.nextCursor = String(nextOffset);
			return page;
		},
		async createNote(input) {
			const state = ensure(input.projectId);
			const now = new Date().toISOString();
			const note: TekMemoServerMemoryNote = {
				id: `note_${crypto.randomUUID?.() ?? `${Date.now()}_${state.notes.length + 1}`}`,
				kind: input.kind ?? "note",
				content: input.content,
				createdAt: now,
				updatedAt: now,
			};
			if (input.title) note.title = input.title;
			if (input.tags) note.tags = input.tags;
			if (input.confidence !== undefined) note.confidence = input.confidence;
			if (input.source) note.source = input.source;
			if (input.metadata) note.metadata = input.metadata;
			state.notes.unshift(note);
			state.project.updatedAt = now;
			return note;
		},
		async deleteNote(input) {
			const state = ensure(input.projectId);
			const before = state.notes.length;
			state.notes = state.notes.filter((note) => note.id !== input.noteId);
			return { deleted: state.notes.length !== before };
		},
		async recall(input) {
			const state = ensure(input.projectId);
			const query = input.query.toLowerCase();
			const hits: TekMemoServerRecallHit[] = [];
			if (state.core.content.toLowerCase().includes(query)) {
				hits.push({
					id: "core",
					content: state.core.content,
					score: 1,
					kind: "summary" as MemoryKind,
					title: "Core Memory",
				});
			}
			for (const note of state.notes) {
				const haystack = `${note.title ?? ""}
${note.content}
${note.tags?.join(" ") ?? ""}`.toLowerCase();
				if (!haystack.includes(query)) continue;
				hits.push({
					id: note.id,
					content: note.content,
					score: 0.8,
					kind: note.kind,
					title: note.title,
					tags: note.tags,
					metadata: note.metadata,
					source: note.source,
				});
			}
			return { hits: hits.slice(0, input.topK ?? 10) };
		},
		async index(input) {
			const state = ensure(input.projectId);
			return { indexed: state.notes.length + 1, mode: "inline" };
		},
		async createAgentSession(input) {
			const state = ensure(input.projectId);
			const existing = state.agentSessions.find(
				(session) => session.sessionId === input.sessionId,
			);
			if (existing) return existing;
			const now = new Date().toISOString();
			const session: TekMemoServerAgentSession = {
				id: `ags_${crypto.randomUUID?.() ?? `${Date.now()}_${state.agentSessions.length + 1}`}`,
				projectId: input.projectId,
				sessionId: input.sessionId,
				task: input.task,
				workspaceProvider: input.workspaceProvider ?? "agentfs",
				status: "active",
				createdAt: now,
			};
			if (input.actorId) session.actorId = input.actorId;
			if (input.workspaceRoot) session.workspaceRoot = input.workspaceRoot;
			if (input.metadata) session.metadata = input.metadata;
			state.agentSessions.unshift(session);
			state.project.updatedAt = now;
			return session;
		},
		async addAgentSessionEvent(input) {
			const state = ensure(input.projectId);
			const event: TekMemoServerAgentSessionEvent = {
				id: `ase_${crypto.randomUUID?.() ?? `${Date.now()}_${state.agentSessionEvents.length + 1}`}`,
				projectId: input.projectId,
				sessionId: input.sessionId,
				type: input.type,
				message: input.message,
				occurredAt: input.occurredAt ?? new Date().toISOString(),
			};
			if (input.metadata) event.metadata = input.metadata;
			state.agentSessionEvents.unshift(event);
			return event;
		},
		async extractAgentSessionMemory(input) {
			const state = ensure(input.projectId);
			const extraction: TekMemoServerAgentSessionExtraction = {
				id: `age_${crypto.randomUUID?.() ?? `${Date.now()}_${state.agentSessionExtractions.length + 1}`}`,
				projectId: input.projectId,
				sessionId: input.sessionId,
				summary: input.summary ?? "",
				durableMemory: input.durableMemory ?? "",
				followUps: input.followUps ?? "",
				errors: input.errors ?? "",
				changes: input.changes ?? "",
				approvalStatus: "pending",
				createdAt: new Date().toISOString(),
			};
			if (input.checkpointLabel)
				extraction.checkpointLabel = input.checkpointLabel;
			state.agentSessionExtractions.unshift(extraction);
			return extraction;
		},
		async approveAgentSessionMemory(input) {
			const state = ensure(input.projectId);
			const extraction = state.agentSessionExtractions.find(
				(item) =>
					item.id === input.extractionId && item.sessionId === input.sessionId,
			);
			if (!extraction) {
				throw new Error("Agent session extraction not found.");
			}
			const content = input.content ?? extraction.durableMemory;
			if (content.trim().length > 0) {
				const note = await this.createNote({
					projectId: input.projectId,
					kind: input.kind ?? "note",
					title: input.title ?? `Agent session ${input.sessionId}`,
					content,
					tags: input.tags,
					source: "agent-session",
					metadata: {
						sessionId: input.sessionId,
						extractionId: input.extractionId,
						...(input.approvedBy ? { approvedBy: input.approvedBy } : {}),
					},
				});
				extraction.createdMemoryNoteId = note.id;
			}
			extraction.approvalStatus = "approved";
			return extraction;
		},
		async completeAgentSession(input) {
			const state = ensure(input.projectId);
			let session = state.agentSessions.find(
				(item) => item.sessionId === input.sessionId,
			);
			if (!session) {
				session = await this.createAgentSession({
					projectId: input.projectId,
					sessionId: input.sessionId,
					task: "Agent session",
				});
			}
			session.status = input.status ?? "completed";
			session.completedAt = input.completedAt ?? new Date().toISOString();
			if (input.checkpointLabel) {
				session.metadata = {
					...(session.metadata ?? {}),
					checkpointLabel: input.checkpointLabel,
				};
			}
			state.project.updatedAt = session.completedAt;
			return session;
		},
	};
}
