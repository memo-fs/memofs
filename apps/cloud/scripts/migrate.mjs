#!/usr/bin/env node
/**
 * Applies the committed Drizzle migrations to a Turso/libSQL database.
 *
 * Replaces the old `wrangler d1 migrations apply` path (D1) so the cloud's
 * metadata DB stays on Turso/libSQL — load-bearing for the ADR 0010 concurrency
 * layer and for OSS self-host portability (reconciliation K1).
 *
 * Mirrors `src/test-utils/db.ts` `applyMigrations`: reads every `drizzle/*.sql`,
 * splits on Drizzle's `--> statement-breakpoint`, and runs each file as one
 * atomic `batch("write")`. The split + read-at-runtime discipline keeps the
 * applied schema in lock-step with the deployed migration — drift fails the
 * command, not a deploy.
 *
 * Target resolution (first wins):
 *   1. `--url`/`--token` flags (explicit).
 *   2. `DATABASE_URL`/`DATABASE_AUTH_TOKEN` env vars (`.dev.vars`/CI/prod).
 *
 * Usage:
 *   pnpm db:migrate                              # local: reads .dev.vars
 *   pnpm db:migrate --url libsql://… --token …   # explicit
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(here, "..", "drizzle");
const STATEMENT_BREAK = "--> statement-breakpoint";

// Load local dev vars from .dev.vars if present
const devVarsPath = join(here, "..", ".dev.vars");
if (existsSync(devVarsPath)) {
	const content = readFileSync(devVarsPath, "utf8");
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const idx = trimmed.indexOf("=");
		if (idx === -1) continue;
		const key = trimmed.slice(0, idx).trim();
		const val = trimmed.slice(idx + 1).trim();
		if (key && !process.env[key]) {
			process.env[key] = val.replace(/^["']|["']$/g, "");
		}
	}
}

function parseArgs(argv) {
	const out = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--url") out.url = argv[++i];
		else if (a === "--token") out.token = argv[++i];
	}
	return out;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const url = args.url ?? process.env.DATABASE_URL;
	const token = args.token ?? process.env.DATABASE_AUTH_TOKEN;
	if (!url) {
		console.error(
			"DATABASE_URL is required. Set it in .dev.vars, pass --url, or run `pnpm dev:db` for local sqld.",
		);
		process.exit(1);
	}

	const client = createClient({ url, authToken: token });
	const files = readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith(".sql"))
		.sort();

	for (const file of files) {
		const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
		const statements = sql
			.split(STATEMENT_BREAK)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		await client.batch(
			statements.map((s) => ({ sql: s, args: [] })),
			"write",
		);
		console.log(`  applied ${file}`);
	}
	console.log(`\n✓ ${files.length} migration(s) applied to ${url}`);
	await client.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
