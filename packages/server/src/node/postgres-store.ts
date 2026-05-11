import { Pool, type PoolConfig } from "pg";
import type {
	AgentSessionApprovalStatus,
	AgentSessionStatus,
	JsonObject,
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

export interface CreatePostgresTekMemoStoreOptions {
	connectionString?: string;
	pool?: Pool;
	poolConfig?: PoolConfig;
	defaultProjectId?: string;
	defaultCoreMemory?: string;
}

export interface PostgresTekMemoStore extends TekMemoServerStore {
	readonly pool: Pool;
	migrate(): Promise<void>;
	close(): Promise<void>;
}

export function createPostgresTekMemoStore(
	options: CreatePostgresTekMemoStoreOptions = {},
): PostgresTekMemoStore {
	const pool =
		options.pool ??
		new Pool({
			connectionString: options.connectionString,
			...options.poolConfig,
		});
	const defaultProjectId = options.defaultProjectId ?? "default";
	const defaultCoreMemory =
		options.defaultCoreMemory ??
		`# Core Memory

No memory has been written yet.
`;

	const ensureDefaultProject = async () => {
		await ensureProject(pool, defaultProjectId, "Default", defaultCoreMemory);
	};

	return {
		pool,
		async migrate() {
			await migratePostgresTekMemoStore(pool);
			await ensureDefaultProject();
		},
		async close() {
			if (!options.pool) await pool.end();
		},
		async isReady() {
			try {
				await pool.query("select 1");
				return true;
			} catch {
				return false;
			}
		},
		async listProjects() {
			const result = await pool.query(`
				select id, name, created_at, updated_at
				from tekmemo_projects
				order by created_at asc
			`);
			return result.rows.map(mapProjectRow);
		},
		async ensureProject(input) {
			return ensureProject(
				pool,
				input.projectId,
				input.name ?? input.projectId,
				defaultCoreMemory,
			);
		},
		async readCore(projectId) {
			await ensureProject(pool, projectId, projectId, defaultCoreMemory);
			const result = await pool.query(
				`
				select content, updated_at, version
				from tekmemo_core_memories
				where project_id = $1
				`,
				[projectId],
			);
			const row = result.rows[0];
			return {
				content: row?.content ?? defaultCoreMemory,
				updatedAt: toIso(row?.updated_at ?? new Date()),
				version: Number(row?.version ?? 1),
			};
		},
		async updateCore(input) {
			await ensureProject(
				pool,
				input.projectId,
				input.projectId,
				defaultCoreMemory,
			);
			const result = await pool.query(
				`
				insert into tekmemo_core_memories (project_id, content, version)
				values ($1, $2, 1)
				on conflict (project_id) do update set
					content = excluded.content,
					version = tekmemo_core_memories.version + 1,
					updated_at = now()
				returning content, updated_at, version
				`,
				[input.projectId, input.content],
			);
			await touchProject(pool, input.projectId);
			return mapCoreRow(result.rows[0]);
		},
		async listNotes(input) {
			await ensureProject(
				pool,
				input.projectId,
				input.projectId,
				defaultCoreMemory,
			);
			const limit = input.limit ?? 50;
			const offset = input.cursor ? Number(input.cursor) : 0;
			const values: unknown[] = [input.projectId];
			const where = ["project_id = $1"];
			if (input.kind) {
				values.push(input.kind);
				where.push(`kind = $${values.length}`);
			}
			if (input.tag) {
				values.push(input.tag);
				where.push(`$${values.length} = any(tags)`);
			}
			values.push(limit + 1, offset);
			const result = await pool.query(
				`
				select id, kind, title, content, tags, confidence, source, metadata, created_at, updated_at
				from tekmemo_memory_notes
				where ${where.join(" and ")}
				order by created_at desc
				limit $${values.length - 1} offset $${values.length}
				`,
				values,
			);
			const rows = result.rows.slice(0, limit);
			const page: TekMemoServerPage<TekMemoServerMemoryNote> = {
				items: rows.map(mapNoteRow),
			};
			if (result.rows.length > limit) page.nextCursor = String(offset + limit);
			return page;
		},
		async createNote(input) {
			await ensureProject(
				pool,
				input.projectId,
				input.projectId,
				defaultCoreMemory,
			);
			const result = await pool.query(
				`
				insert into tekmemo_memory_notes
					(project_id, kind, title, content, tags, confidence, source, metadata)
				values ($1, $2, $3, $4, $5, $6, $7, $8)
				returning id, kind, title, content, tags, confidence, source, metadata, created_at, updated_at
				`,
				[
					input.projectId,
					input.kind ?? "note",
					input.title ?? null,
					input.content,
					input.tags ?? [],
					input.confidence ?? null,
					input.source ?? null,
					input.metadata ?? {},
				],
			);
			await touchProject(pool, input.projectId);
			return mapNoteRow(result.rows[0]);
		},
		async deleteNote(input) {
			const result = await pool.query(
				`
				delete from tekmemo_memory_notes
				where project_id = $1 and id = $2
				`,
				[input.projectId, input.noteId],
			);
			return { deleted: (result.rowCount ?? 0) > 0 };
		},
		async recall(input) {
			await ensureProject(
				pool,
				input.projectId,
				input.projectId,
				defaultCoreMemory,
			);
			const query = input.query.trim();
			const topK = input.topK ?? 10;
			const like = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
			const hits: TekMemoServerRecallHit[] = [];
			const core = await pool.query(
				`
				select content
				from tekmemo_core_memories
				where project_id = $1 and content ilike $2 escape '\\'
				limit 1
				`,
				[input.projectId, like],
			);
			if (core.rows[0]) {
				hits.push({
					id: "core",
					content: core.rows[0].content,
					score: 1,
					kind: "summary",
					title: "Core Memory",
				});
			}
			const notes = await pool.query(
				`
				select id, kind, title, content, tags, source, metadata,
					case
						when title ilike $2 escape '\\' then 0.95
						when content ilike $2 escape '\\' then 0.85
						else 0.65
					end as score
				from tekmemo_memory_notes
				where project_id = $1
					and (title ilike $2 escape '\\' or content ilike $2 escape '\\' or $3 = any(tags))
				order by score desc, created_at desc
				limit $4
				`,
				[input.projectId, like, query, Math.max(topK - hits.length, 0)],
			);
			for (const row of notes.rows) {
				hits.push({
					id: row.id,
					content: row.content,
					score: Number(row.score),
					kind: row.kind,
					title: row.title ?? undefined,
					tags: row.tags ?? undefined,
					metadata: row.metadata ?? undefined,
					source: row.source ?? undefined,
				});
			}
			return { hits: hits.slice(0, topK) };
		},
		async index(input) {
			const result = await pool.query(
				`
				select 1 from tekmemo_core_memories where project_id = $1
				union all
				select 1 from tekmemo_memory_notes where project_id = $1
				`,
				[input.projectId],
			);
			return { indexed: result.rowCount ?? 0, mode: "inline" as const };
		},
		async createAgentSession(input) {
			await ensureProject(
				pool,
				input.projectId,
				input.projectId,
				defaultCoreMemory,
			);
			const result = await pool.query(
				`
				insert into tekmemo_agent_sessions
					(project_id, session_id, task, actor_id, workspace_provider, workspace_root, status, metadata)
				values ($1, $2, $3, $4, $5, $6, 'active', $7)
				on conflict (project_id, session_id) do update set
					task = excluded.task,
					actor_id = excluded.actor_id,
					workspace_provider = excluded.workspace_provider,
					workspace_root = excluded.workspace_root,
					metadata = excluded.metadata,
					status = 'active',
					completed_at = null
				returning id, project_id, session_id, task, actor_id, workspace_provider, workspace_root, status, metadata, created_at, completed_at
				`,
				[
					input.projectId,
					input.sessionId,
					input.task,
					input.actorId ?? null,
					input.workspaceProvider ?? "agentfs",
					input.workspaceRoot ?? null,
					input.metadata ?? {},
				],
			);
			await touchProject(pool, input.projectId);
			return mapAgentSessionRow(result.rows[0]);
		},
		async addAgentSessionEvent(input) {
			await ensureProject(
				pool,
				input.projectId,
				input.projectId,
				defaultCoreMemory,
			);
			const result = await pool.query(
				`
				insert into tekmemo_agent_session_events
					(project_id, session_id, type, message, metadata, occurred_at)
				values ($1, $2, $3, $4, $5, coalesce($6::timestamptz, now()))
				returning id, project_id, session_id, type, message, metadata, occurred_at
				`,
				[
					input.projectId,
					input.sessionId,
					input.type,
					input.message,
					input.metadata ?? {},
					input.occurredAt ?? null,
				],
			);
			await touchProject(pool, input.projectId);
			return mapAgentSessionEventRow(result.rows[0]);
		},
		async extractAgentSessionMemory(input) {
			await ensureProject(
				pool,
				input.projectId,
				input.projectId,
				defaultCoreMemory,
			);
			const result = await pool.query(
				`
				insert into tekmemo_agent_session_extractions
					(project_id, session_id, summary, durable_memory, follow_ups, errors, changes, checkpoint_label, approval_status)
				values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
				returning id, project_id, session_id, summary, durable_memory, follow_ups, errors, changes, checkpoint_label, approval_status, created_memory_note_id, created_at
				`,
				[
					input.projectId,
					input.sessionId,
					input.summary ?? "",
					input.durableMemory ?? "",
					input.followUps ?? "",
					input.errors ?? "",
					input.changes ?? "",
					input.checkpointLabel ?? null,
				],
			);
			await touchProject(pool, input.projectId);
			return mapAgentSessionExtractionRow(result.rows[0]);
		},
		async approveAgentSessionMemory(input) {
			const extraction = await pool.query(
				`
				select id, durable_memory
				from tekmemo_agent_session_extractions
				where project_id = $1 and session_id = $2 and id = $3
				`,
				[input.projectId, input.sessionId, input.extractionId],
			);
			const row = extraction.rows[0];
			if (!row) {
				throw new Error("Agent session extraction was not found.");
			}
			const content = input.content ?? String(row.durable_memory ?? "");
			if (!content.trim()) {
				throw new Error("Cannot approve empty agent session memory.");
			}
			const note = await pool.query(
				`
				insert into tekmemo_memory_notes
					(project_id, kind, title, content, tags, source, metadata)
				values ($1, $2, $3, $4, $5, 'agent-session', $6)
				returning id
				`,
				[
					input.projectId,
					input.kind ?? "summary",
					input.title ?? `Agent session ${input.sessionId}`,
					content,
					input.tags ?? ["agent-session"],
					{
						sessionId: input.sessionId,
						extractionId: input.extractionId,
						approvedBy: input.approvedBy ?? null,
					},
				],
			);
			const result = await pool.query(
				`
				update tekmemo_agent_session_extractions
				set approval_status = 'approved',
					created_memory_note_id = $4
				where project_id = $1 and session_id = $2 and id = $3
				returning id, project_id, session_id, summary, durable_memory, follow_ups, errors, changes, checkpoint_label, approval_status, created_memory_note_id, created_at
				`,
				[input.projectId, input.sessionId, input.extractionId, note.rows[0].id],
			);
			await touchProject(pool, input.projectId);
			return mapAgentSessionExtractionRow(result.rows[0]);
		},
		async completeAgentSession(input) {
			const status = input.status ?? "completed";
			const result = await pool.query(
				`
				update tekmemo_agent_sessions
				set status = $3,
					completed_at = coalesce($4::timestamptz, now())
				where project_id = $1 and session_id = $2
				returning id, project_id, session_id, task, actor_id, workspace_provider, workspace_root, status, metadata, created_at, completed_at
				`,
				[input.projectId, input.sessionId, status, input.completedAt ?? null],
			);
			if (!result.rows[0]) {
				throw new Error("Agent session was not found.");
			}
			if (input.checkpointLabel) {
				await pool.query(
					`
					insert into tekmemo_agent_session_events
						(project_id, session_id, type, message, metadata)
					values ($1, $2, 'checkpoint', $3, $4)
					`,
					[
						input.projectId,
						input.sessionId,
						`Checkpoint ${input.checkpointLabel}`,
						{ checkpointLabel: input.checkpointLabel },
					],
				);
			}
			await touchProject(pool, input.projectId);
			return mapAgentSessionRow(result.rows[0]);
		},
	};
}

export async function migratePostgresTekMemoStore(pool: Pool): Promise<void> {
	await pool.query(`create extension if not exists vector`);
	await pool.query(`create extension if not exists pgcrypto`);
	await pool.query(`
		create table if not exists tekmemo_projects (
			id text primary key,
			name text not null,
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
		)
	`);
	await pool.query(`
		create table if not exists tekmemo_core_memories (
			project_id text primary key references tekmemo_projects(id) on delete cascade,
			content text not null,
			version integer not null default 1,
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
		)
	`);
	await pool.query(`
		create table if not exists tekmemo_memory_notes (
			id text primary key default 'note_' || replace(gen_random_uuid()::text, '-', ''),
			project_id text not null references tekmemo_projects(id) on delete cascade,
			kind text not null default 'note',
			title text,
			content text not null,
			tags text[] not null default '{}',
			confidence double precision,
			source text,
			metadata jsonb not null default '{}'::jsonb,
			embedding vector,
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
		)
	`);
	await pool.query(`
		create index if not exists tekmemo_memory_notes_project_created_idx
		on tekmemo_memory_notes(project_id, created_at desc)
	`);
	await pool.query(`
		create index if not exists tekmemo_memory_notes_tags_idx
		on tekmemo_memory_notes using gin(tags)
	`);
	await pool.query(`
		create table if not exists tekmemo_agent_sessions (
			id text primary key default 'ags_' || replace(gen_random_uuid()::text, '-', ''),
			project_id text not null references tekmemo_projects(id) on delete cascade,
			session_id text not null,
			task text not null,
			actor_id text,
			workspace_provider text not null default 'agentfs',
			workspace_root text,
			status text not null default 'active',
			metadata jsonb not null default '{}'::jsonb,
			created_at timestamptz not null default now(),
			completed_at timestamptz,
			unique(project_id, session_id)
		)
	`);
	await pool.query(`
		create index if not exists tekmemo_agent_sessions_project_created_idx
		on tekmemo_agent_sessions(project_id, created_at desc)
	`);
	await pool.query(`
		create table if not exists tekmemo_agent_session_events (
			id text primary key default 'age_' || replace(gen_random_uuid()::text, '-', ''),
			project_id text not null references tekmemo_projects(id) on delete cascade,
			session_id text not null,
			type text not null,
			message text not null,
			metadata jsonb not null default '{}'::jsonb,
			occurred_at timestamptz not null default now()
		)
	`);
	await pool.query(`
		create index if not exists tekmemo_agent_session_events_session_idx
		on tekmemo_agent_session_events(project_id, session_id, occurred_at asc)
	`);
	await pool.query(`
		create table if not exists tekmemo_agent_session_extractions (
			id text primary key default 'agex_' || replace(gen_random_uuid()::text, '-', ''),
			project_id text not null references tekmemo_projects(id) on delete cascade,
			session_id text not null,
			summary text not null default '',
			durable_memory text not null default '',
			follow_ups text not null default '',
			errors text not null default '',
			changes text not null default '',
			checkpoint_label text,
			approval_status text not null default 'pending',
			created_memory_note_id text references tekmemo_memory_notes(id) on delete set null,
			created_at timestamptz not null default now()
		)
	`);
	await pool.query(`
		create index if not exists tekmemo_agent_session_extractions_session_idx
		on tekmemo_agent_session_extractions(project_id, session_id, created_at desc)
	`);
}

async function ensureProject(
	pool: Pool,
	projectId: string,
	name: string,
	defaultCoreMemory: string,
): Promise<TekMemoServerProject> {
	const result = await pool.query(
		`
		insert into tekmemo_projects (id, name)
		values ($1, $2)
		on conflict (id) do update set name = coalesce(nullif($2, ''), tekmemo_projects.name)
		returning id, name, created_at, updated_at
		`,
		[projectId, name],
	);
	await pool.query(
		`
		insert into tekmemo_core_memories (project_id, content, version)
		values ($1, $2, 1)
		on conflict (project_id) do nothing
		`,
		[projectId, defaultCoreMemory],
	);
	return mapProjectRow(result.rows[0]);
}

async function touchProject(pool: Pool, projectId: string) {
	await pool.query(
		"update tekmemo_projects set updated_at = now() where id = $1",
		[projectId],
	);
}

function mapProjectRow(row: Record<string, unknown>): TekMemoServerProject {
	return {
		id: String(row.id),
		name: String(row.name),
		createdAt: toIso(row.created_at),
		updatedAt: toIso(row.updated_at),
	};
}

function mapCoreRow(row: Record<string, unknown>): TekMemoServerCoreMemory {
	return {
		content: String(row.content),
		updatedAt: toIso(row.updated_at),
		version: Number(row.version),
	};
}

function mapNoteRow(row: Record<string, unknown>): TekMemoServerMemoryNote {
	const note: TekMemoServerMemoryNote = {
		id: String(row.id),
		kind: row.kind as MemoryKind,
		content: String(row.content),
		createdAt: toIso(row.created_at),
		updatedAt: toIso(row.updated_at),
	};
	if (row.title) note.title = String(row.title);
	if (Array.isArray(row.tags) && row.tags.length)
		note.tags = row.tags.map(String);
	if (typeof row.confidence === "number") note.confidence = row.confidence;
	if (row.source) note.source = String(row.source);
	if (row.metadata && typeof row.metadata === "object") {
		note.metadata = row.metadata as JsonObject;
	}
	return note;
}

function mapAgentSessionRow(
	row: Record<string, unknown>,
): TekMemoServerAgentSession {
	const session: TekMemoServerAgentSession = {
		id: String(row.id),
		projectId: String(row.project_id),
		sessionId: String(row.session_id),
		task: String(row.task),
		workspaceProvider: String(
			row.workspace_provider ?? "agentfs",
		) as TekMemoServerAgentSession["workspaceProvider"],
		status: String(row.status ?? "active") as AgentSessionStatus,
		createdAt: toIso(row.created_at),
	};
	if (row.actor_id) session.actorId = String(row.actor_id);
	if (row.workspace_root) session.workspaceRoot = String(row.workspace_root);
	if (row.metadata && typeof row.metadata === "object") {
		session.metadata = row.metadata as JsonObject;
	}
	if (row.completed_at) session.completedAt = toIso(row.completed_at);
	return session;
}

function mapAgentSessionEventRow(
	row: Record<string, unknown>,
): TekMemoServerAgentSessionEvent {
	const event: TekMemoServerAgentSessionEvent = {
		id: String(row.id),
		projectId: String(row.project_id),
		sessionId: String(row.session_id),
		type: String(row.type),
		message: String(row.message),
		occurredAt: toIso(row.occurred_at),
	};
	if (row.metadata && typeof row.metadata === "object") {
		event.metadata = row.metadata as JsonObject;
	}
	return event;
}

function mapAgentSessionExtractionRow(
	row: Record<string, unknown>,
): TekMemoServerAgentSessionExtraction {
	const extraction: TekMemoServerAgentSessionExtraction = {
		id: String(row.id),
		projectId: String(row.project_id),
		sessionId: String(row.session_id),
		summary: String(row.summary ?? ""),
		durableMemory: String(row.durable_memory ?? ""),
		followUps: String(row.follow_ups ?? ""),
		errors: String(row.errors ?? ""),
		changes: String(row.changes ?? ""),
		approvalStatus: String(
			row.approval_status ?? "pending",
		) as AgentSessionApprovalStatus,
		createdAt: toIso(row.created_at),
	};
	if (row.checkpoint_label) {
		extraction.checkpointLabel = String(row.checkpoint_label);
	}
	if (row.created_memory_note_id) {
		extraction.createdMemoryNoteId = String(row.created_memory_note_id);
	}
	return extraction;
}

function toIso(value: unknown): string {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "string") return new Date(value).toISOString();
	return new Date().toISOString();
}
