import { Pool, type PoolConfig } from "pg";
import type {
	JobQueue,
	JobQueueEnqueueOptions,
	JobQueueHandler,
	JobQueueJob,
} from "../storage/job-queue.js";

export interface CreatePostgresJobQueueOptions {
	connectionString?: string;
	pool?: Pool;
	poolConfig?: PoolConfig;
	pollIntervalMs?: number;
}

export interface PostgresJobQueue extends JobQueue {
	readonly pool: Pool;
	migrate(): Promise<void>;
	close(): Promise<void>;
}

export function createPostgresJobQueue(
	options: CreatePostgresJobQueueOptions = {},
): PostgresJobQueue {
	const pool =
		options.pool ??
		new Pool({
			connectionString: options.connectionString,
			...options.poolConfig,
		});
	const pollIntervalMs = options.pollIntervalMs ?? 1_000;

	return {
		kind: "postgres",
		pool,
		async migrate() {
			await migratePostgresJobQueue(pool);
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
		async enqueue<TPayload>(
			name: string,
			payload: TPayload,
			jobOptions?: JobQueueEnqueueOptions,
		) {
			const result = await pool.query(
				`
				insert into tekmemo_jobs (name, payload, run_after, max_attempts)
				values ($1, $2, $3, $4)
				returning id
				`,
				[
					name,
					JSON.stringify(payload ?? null),
					jobOptions?.runAfter ?? new Date(),
					jobOptions?.maxAttempts ?? 3,
				],
			);
			return { id: String(result.rows[0].id) };
		},
		async process<TPayload>(
			name: string,
			handler: JobQueueHandler<TPayload>,
			processOptions?: { signal?: AbortSignal },
		) {
			while (!processOptions?.signal?.aborted) {
				const job = await claimNextJob<TPayload>(pool, name);
				if (!job) {
					await sleep(pollIntervalMs, processOptions?.signal);
					continue;
				}

				try {
					await handler(job);
					await completeJob(pool, job.id);
				} catch (error) {
					await failJob(pool, job, error);
				}
			}
		},
	};
}

export async function migratePostgresJobQueue(pool: Pool): Promise<void> {
	await pool.query(`create extension if not exists pgcrypto`);
	await pool.query(`
		create table if not exists tekmemo_jobs (
			id text primary key default 'job_' || replace(gen_random_uuid()::text, '-', ''),
			name text not null,
			payload jsonb not null default 'null'::jsonb,
			status text not null default 'queued',
			attempts integer not null default 0,
			max_attempts integer not null default 3,
			run_after timestamptz not null default now(),
			locked_at timestamptz,
			last_error text,
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
		)
	`);
	await pool.query(`
		create index if not exists tekmemo_jobs_ready_idx
		on tekmemo_jobs(name, status, run_after, created_at)
	`);
}

async function claimNextJob<TPayload>(
	pool: Pool,
	name: string,
): Promise<JobQueueJob<TPayload> | null> {
	const result = await pool.query(
		`
		with next_job as (
			select id
			from tekmemo_jobs
			where name = $1
				and status = 'queued'
				and run_after <= now()
				and attempts < max_attempts
			order by created_at asc
			limit 1
			for update skip locked
		)
		update tekmemo_jobs
		set status = 'running', attempts = attempts + 1, locked_at = now(), updated_at = now()
		where id in (select id from next_job)
		returning id, name, payload, attempts, max_attempts
		`,
		[name],
	);
	const row = result.rows[0];
	if (!row) return null;
	return {
		id: String(row.id),
		name: String(row.name),
		payload: row.payload as TPayload,
		attempts: Number(row.attempts),
		maxAttempts: Number(row.max_attempts),
	};
}

async function completeJob(pool: Pool, id: string): Promise<void> {
	await pool.query(
		`
		update tekmemo_jobs
		set status = 'completed', updated_at = now()
		where id = $1
		`,
		[id],
	);
}

async function failJob(
	pool: Pool,
	job: JobQueueJob,
	error: unknown,
): Promise<void> {
	const message = error instanceof Error ? error.message : String(error);
	const retry = job.attempts < job.maxAttempts;
	await pool.query(
		`
		update tekmemo_jobs
		set status = $2,
			last_error = $3,
			run_after = case when $2 = 'queued' then now() + interval '30 seconds' else run_after end,
			updated_at = now()
		where id = $1
		`,
		[job.id, retry ? "queued" : "failed", message],
	);
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) return;
	await new Promise<void>((resolve) => {
		const timeout = setTimeout(resolve, ms);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timeout);
				resolve();
			},
			{ once: true },
		);
	});
}
