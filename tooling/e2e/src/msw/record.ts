/**
 * MSW fixture recorder — hits real APIs once (if keys present) and writes sanitized fixtures.
 *
 * @remarks
 * - Reads dotenv keys from env / .env file: GITHUB_TOKEN, GITHUB_REPO, NOTION_TOKEN, NOTION_DATABASE_ID, OPENAI_API_KEY, VOYAGE_API_KEY
 * - Hits real APIs once per service, redacts Authorization to test-token-***, writes fixtures/*.json sanitized.
 * - Includes RUN_ID style (test-run-live-xxx) and secret redacted proof.
 * - No secret in logs or files — tokens never written, only test-token-*** appears.
 * - When keys absent, exits with message and keeps existing deterministic fixtures.
 *
 * Usage: `pnpm --filter @repo/e2e msw:record` or `tsx src/msw/record.ts`
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixturesDir = join(__dirname, "fixtures");
const openaiDir = join(fixturesDir, "openai");
const voyageDir = join(fixturesDir, "voyage");

const REDACTED = "test-token-***";
const RUN_ID = `test-run-live-${Date.now()}`;

// ---------------------------------------------------------------------------
// Minimal .env loader (no dep) — reads repo root .env if present
// ---------------------------------------------------------------------------
function loadDotEnv(): void {
	try {
		// Walk up to repo root finding .env
		let dir = __dirname;
		for (let i = 0; i < 6; i++) {
			const envPath = join(dir, ".env");
			if (existsSync(envPath)) {
				const raw = readFileSync(envPath, "utf8");
				for (const line of raw.split("\n")) {
					const trimmed = line.trim();
					if (!trimmed || trimmed.startsWith("#")) continue;
					const eq = trimmed.indexOf("=");
					if (eq === -1) continue;
					const key = trimmed.slice(0, eq).trim();
					let val = trimmed.slice(eq + 1).trim();
					if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
						val = val.slice(1, -1);
					}
					if (process.env[key] === undefined) {
						process.env[key] = val;
					}
				}
				break;
			}
			dir = join(dir, "..");
		}
	} catch {
		// ignore
	}
}
loadDotEnv();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function logRedacted(msg: string): void {
	// Ensure we never log a raw token — replace any sk-..., ghp_... with REDACTED
	const sanitized = msg
		.replace(/sk-[A-Za-z0-9_-]+/g, REDACTED)
		.replace(/gh[pousr]_[A-Za-z0-9_]+/gi, REDACTED)
		.replace(/secret_[A-Za-z0-9]+/gi, REDACTED);
	// Use console.error with prefix for CLI script (no console.log per standards, but CLI logging is okay via error stream)
	console.error(sanitized);
}

function ensureDirs(): void {
	mkdirSync(fixturesDir, { recursive: true });
	mkdirSync(openaiDir, { recursive: true });
	mkdirSync(voyageDir, { recursive: true });
}

function sanitizeString(value: string): string {
	return value
		.replace(/sk-[A-Za-z0-9_-]+/g, REDACTED)
		.replace(/gh[pousr]_[A-Za-z0-9_]+/gi, REDACTED)
		.replace(/secret_[A-Za-z0-9]+/gi, REDACTED)
		.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, `Bearer ${REDACTED}`);
}

function deepSanitize<T>(value: T): T {
	if (typeof value === "string") {
		return sanitizeString(value) as unknown as T;
	}
	if (Array.isArray(value)) {
		return value.map((v) => deepSanitize(v)) as unknown as T;
	}
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			// Never include raw token keys
			if (["token", "apiKey", "authorization"].includes(k.toLowerCase())) {
				out[k] = REDACTED;
			} else {
				out[k] = deepSanitize(v);
			}
		}
		return out as unknown as T;
	}
	return value;
}

function genEmbedding(dim: number, seed: number): number[] {
	const arr: number[] = new Array(dim);
	for (let i = 0; i < dim; i++) {
		const v = Math.sin(i * 0.13 + seed * 0.7) * 0.5 + Math.cos(i * 0.07 + seed) * 0.3;
		arr[i] = Math.round(v * 1e6) / 1e6;
	}
	return arr;
}

// ---------------------------------------------------------------------------
// GitHub record
// ---------------------------------------------------------------------------
async function recordGitHub(): Promise<void> {
	const token = process.env.GITHUB_TOKEN;
	if (!token) {
		logRedacted("[msw:record] GITHUB_TOKEN not set — skipping GitHub live recording, keeping deterministic fixture");
		return;
	}
	const repo = process.env.GITHUB_REPO ?? "example/repo";
	const [owner, name] = repo.split("/");
	if (!owner || !name) {
		logRedacted(`[msw:record] GITHUB_REPO invalid: ${repo} — expected owner/name`);
		return;
	}

	logRedacted(`[msw:record] Recording GitHub fixture for ${owner}/${name} with RUN_ID ${RUN_ID} (token redacted)`);

	const query = `
		query($owner: String!, $name: String!, $first: Int!) {
			repository(owner: $owner, name: $name) {
				issues(first: $first, orderBy: {field: CREATED_AT, direction: DESC}) {
					pageInfo { hasNextPage endCursor }
					nodes { number title body url state createdAt author { login } labels(first: 5) { nodes { name } } }
				}
				pullRequests(first: $first, orderBy: {field: CREATED_AT, direction: DESC}) {
					pageInfo { hasNextPage endCursor }
					nodes { number title body url state createdAt author { login } labels(first: 5) { nodes { name } } }
				}
				discussions(first: $first, orderBy: {field: CREATED_AT, direction: DESC}) {
					pageInfo { hasNextPage endCursor }
					nodes { number title body url createdAt author { login } }
				}
			}
		}`;

	try {
		const resp = await fetch("https://api.github.com/graphql", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				Accept: "application/vnd.github+json",
			},
			body: JSON.stringify({ query, variables: { owner, name, first: 2 } }),
		});
		if (!resp.ok) {
			logRedacted(`[msw:record] GitHub API failed: ${resp.status} ${resp.statusText} — keeping existing fixture`);
			return;
		}
		const data = (await resp.json()) as unknown;
		const sanitized = deepSanitize(data) as { data: unknown };

		const fixture = {
			runId: RUN_ID,
			api: "github-graphql",
			sanitized: true,
			secretRedacted: REDACTED,
			payload: sanitized,
		};

		writeFileSync(join(fixturesDir, "github.json"), JSON.stringify(fixture, null, 2));
		logRedacted(`[msw:record] Wrote ${join(fixturesDir, "github.json")} with RUN_ID ${RUN_ID}`);
	} catch (e) {
		logRedacted(`[msw:record] GitHub recording error: ${(e as Error).message} — redacted, keeping fixture`);
	}
}

// ---------------------------------------------------------------------------
// Notion record
// ---------------------------------------------------------------------------
async function recordNotion(): Promise<void> {
	const token = process.env.NOTION_TOKEN;
	if (!token) {
		logRedacted("[msw:record] NOTION_TOKEN not set — skipping Notion live recording");
		return;
	}
	const databaseId = process.env.NOTION_DATABASE_ID;
	const searchQuery = process.env.NOTION_SEARCH_QUERY ?? "e2e";

	const url = databaseId
		? `https://api.notion.com/v1/databases/${databaseId}/query`
		: "https://api.notion.com/v1/search";

	logRedacted(`[msw:record] Recording Notion fixture from ${url} RUN_ID ${RUN_ID}`);

	try {
		const resp = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Notion-Version": "2022-06-28",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(
				databaseId ? { page_size: 2 } : { query: searchQuery, page_size: 2, filter: { value: "page", property: "object" } },
			),
		});
		if (!resp.ok) {
			logRedacted(`[msw:record] Notion API failed: ${resp.status} — keeping fixture`);
			return;
		}
		const data = (await resp.json()) as unknown;
		const sanitized = deepSanitize(data);

		const fixture = {
			runId: RUN_ID,
			api: "notion",
			sanitized: true,
			secretRedacted: REDACTED,
			payload: sanitized,
		};
		writeFileSync(join(fixturesDir, "notion.json"), JSON.stringify(fixture, null, 2));
		logRedacted(`[msw:record] Wrote ${join(fixturesDir, "notion.json")}`);
	} catch (e) {
		logRedacted(`[msw:record] Notion recording error: ${(e as Error).message}`);
	}
}

// ---------------------------------------------------------------------------
// OpenAI record
// ---------------------------------------------------------------------------
async function recordOpenAI(): Promise<void> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		logRedacted("[msw:record] OPENAI_API_KEY not set — skipping OpenAI live recording");
		return;
	}

	logRedacted(`[msw:record] Recording OpenAI embed fixture RUN_ID ${RUN_ID}`);

	try {
		const resp = await fetch("https://api.openai.com/v1/embeddings", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				input: ["MemoFS e2e fixture", "Second text"],
				model: "text-embedding-3-small",
				dimensions: 384,
				encoding_format: "float",
			}),
		});
		if (!resp.ok) {
			logRedacted(`[msw:record] OpenAI API failed: ${resp.status} — keeping fixture`);
			return;
		}
		const data = (await resp.json()) as { data: { embedding: number[]; index: number }[]; model: string };
		const sanitized = deepSanitize(data);

		const fixture = {
			runId: RUN_ID,
			api: "openai",
			sanitized: true,
			secretRedacted: REDACTED,
			payload: sanitized,
		};
		writeFileSync(join(openaiDir, "embed.json"), JSON.stringify(fixture, null, 2));
		logRedacted(`[msw:record] Wrote ${join(openaiDir, "embed.json")}`);
	} catch (e) {
		logRedacted(`[msw:record] OpenAI error: ${(e as Error).message}`);
	}
}

// ---------------------------------------------------------------------------
// Voyage record
// ---------------------------------------------------------------------------
async function recordVoyage(): Promise<void> {
	const apiKey = process.env.VOYAGE_API_KEY;
	if (!apiKey) {
		logRedacted("[msw:record] VOYAGE_API_KEY not set — skipping Voyage live recording");
		return;
	}

	logRedacted(`[msw:record] Recording Voyage fixtures RUN_ID ${RUN_ID}`);

	try {
		const embedResp = await fetch("https://api.voyageai.com/v1/embeddings", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				input: ["MemoFS e2e fixture", "Second text"],
				model: "voyage-4-lite",
				output_dimension: 512,
			}),
		});
		if (embedResp.ok) {
			const data = (await embedResp.json()) as unknown;
			const sanitized = deepSanitize(data);
			const fixture = {
				runId: RUN_ID,
				api: "voyage",
				sanitized: true,
				secretRedacted: REDACTED,
				payload: sanitized,
			};
			writeFileSync(join(voyageDir, "embed.json"), JSON.stringify(fixture, null, 2));
			logRedacted(`[msw:record] Wrote ${join(voyageDir, "embed.json")}`);
		} else {
			logRedacted(`[msw:record] Voyage embed failed: ${embedResp.status}`);
		}

		const rerankResp = await fetch("https://api.voyageai.com/v1/rerank", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				query: "MemoFS memory",
				documents: ["Doc A", "Doc B", "Doc C"],
				model: "rerank-2",
				top_k: 3,
			}),
		});
		if (rerankResp.ok) {
			const data = (await rerankResp.json()) as unknown;
			const sanitized = deepSanitize(data);
			const fixture = {
				runId: RUN_ID,
				api: "voyage-rerank",
				sanitized: true,
				secretRedacted: REDACTED,
				payload: sanitized,
			};
			writeFileSync(join(voyageDir, "rerank.json"), JSON.stringify(fixture, null, 2));
			logRedacted(`[msw:record] Wrote ${join(voyageDir, "rerank.json")}`);
		} else {
			logRedacted(`[msw:record] Voyage rerank failed: ${rerankResp.status}`);
		}
	} catch (e) {
		logRedacted(`[msw:record] Voyage error: ${(e as Error).message}`);
	}
}

// ---------------------------------------------------------------------------
// Fallback deterministic fixtures (ensures files exist even when no keys)
// ---------------------------------------------------------------------------
function ensureDeterministicFixtures(): void {
	if (!existsSync(join(fixturesDir, "github.json"))) {
		const fixture = {
			runId: "test-run-e2e-0021-001",
			api: "github-graphql",
			sanitized: true,
			secretRedacted: REDACTED,
			payload: {
				data: {
					repository: {
						issues: {
							pageInfo: { hasNextPage: false, endCursor: null },
							nodes: [
								{
									number: 1,
									title: "Fix bug A [RUN_ID test-run-e2e-0021-001]",
									body: `Body RUN_ID test-run-e2e-0021-001 token ${REDACTED}`,
									url: "https://github.com/example/repo/issues/1",
									state: "OPEN",
									createdAt: "2024-01-01T00:00:00Z",
									author: { login: "alice" },
									labels: { nodes: [{ name: "bug" }] },
								},
							],
						},
						pullRequests: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] },
						discussions: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] },
					},
				},
			},
		};
		writeFileSync(join(fixturesDir, "github.json"), JSON.stringify(fixture, null, 2));
	}
	if (!existsSync(join(fixturesDir, "notion.json"))) {
		writeFileSync(
			join(fixturesDir, "notion.json"),
			JSON.stringify(
				{
					runId: "test-run-e2e-0021-002",
					api: "notion",
					sanitized: true,
					secretRedacted: REDACTED,
					payload: {
						object: "list",
						results: [
							{
								object: "page",
								id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
								url: "https://www.notion.so/Test",
								created_time: "2024-01-01T00:00:00.000Z",
								last_edited_time: "2024-01-02T00:00:00.000Z",
								created_by: { id: "user-1" },
								properties: {
									Name: { type: "title", title: [{ plain_text: "Test Notion Page [RUN_ID test-run-e2e-0021-002]" }] },
								},
							},
						],
						has_more: false,
						next_cursor: null,
					},
				},
				null,
				2,
			),
		);
	}
	if (!existsSync(join(openaiDir, "embed.json"))) {
		writeFileSync(
			join(openaiDir, "embed.json"),
			JSON.stringify(
				{
					runId: "test-run-e2e-0021-003",
					api: "openai",
					sanitized: true,
					secretRedacted: REDACTED,
					payload: {
						object: "list",
						data: [
							{ object: "embedding", embedding: genEmbedding(384, 1), index: 0 },
							{ object: "embedding", embedding: genEmbedding(384, 2), index: 1 },
						],
						model: "text-embedding-3-small",
						usage: { prompt_tokens: 12, total_tokens: 12 },
					},
				},
				null,
				2,
			),
		);
	}
	if (!existsSync(join(voyageDir, "embed.json"))) {
		writeFileSync(
			join(voyageDir, "embed.json"),
			JSON.stringify(
				{
					runId: "test-run-e2e-0021-004",
					api: "voyage",
					sanitized: true,
					secretRedacted: REDACTED,
					payload: {
						object: "list",
						data: [
							{ object: "embedding", embedding: genEmbedding(384, 10), index: 0 },
							{ object: "embedding", embedding: genEmbedding(384, 11), index: 1 },
						],
						model: "voyage-4-lite",
						usage: { total_tokens: 12 },
					},
				},
				null,
				2,
			),
		);
	}
	if (!existsSync(join(voyageDir, "rerank.json"))) {
		writeFileSync(
			join(voyageDir, "rerank.json"),
			JSON.stringify(
				{
					runId: "test-run-e2e-0021-005",
					api: "voyage-rerank",
					sanitized: true,
					secretRedacted: REDACTED,
					payload: {
						object: "list",
						data: [
							{ index: 0, relevance_score: 0.9, document: "Doc A [RUN_ID test-run-e2e-0021-005]" },
							{ index: 1, relevance_score: 0.5, document: "Doc B" },
						],
						model: "rerank-2",
						usage: { total_tokens: 20 },
					},
				},
				null,
				2,
			),
		);
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
	ensureDirs();
	ensureDeterministicFixtures();

	const hasAnyKey = !!(process.env.GITHUB_TOKEN || process.env.NOTION_TOKEN || process.env.OPENAI_API_KEY || process.env.VOYAGE_API_KEY);

	if (!hasAnyKey) {
		logRedacted("[msw:record] No live keys set — deterministic fixtures already exist, no action needed");
		logRedacted("[msw:record] Set GITHUB_TOKEN, NOTION_TOKEN, OPENAI_API_KEY, VOYAGE_API_KEY to refresh fixtures live (secrets redacted to test-token-***)");
		return;
	}

	logRedacted(`[msw:record] Starting live recording with RUN_ID ${RUN_ID} — tokens redacted`);

	await recordGitHub();
	await recordNotion();
	await recordOpenAI();
	await recordVoyage();

	logRedacted("[msw:record] Done — all fixtures sanitized, secret redacted to test-token-***, no secret in logs");
}

await main();
