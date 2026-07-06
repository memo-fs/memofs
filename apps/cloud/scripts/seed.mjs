#!/usr/bin/env node
/**
 * Seeds the local dev Turso/libSQL database from `scripts/seed.sql`.
 *
 * Replaces the old `wrangler d1 execute --file` path (D1). Resolves the target
 * the same way `migrate.mjs` does (flags → env). Statement splitting mirrors
 * the migrator: Drizzle-style `--> statement-breakpoint` boundaries, one atomic
 * `batch("write")` per file.
 *
 * Usage:
 *   pnpm db:seed
 *   pnpm db:seed --url libsql://… --token …
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const here = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = join(here, "seed.sql");
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
			"DATABASE_URL is required. Set it in .dev.vars or pass --url.",
		);
		process.exit(1);
	}

	const client = createClient({ url, authToken: token });
	const rawSql = readFileSync(SEED_FILE, "utf8");

	let statements = [];
	if (rawSql.includes(STATEMENT_BREAK)) {
		statements = rawSql.split(STATEMENT_BREAK);
	} else {
		statements = rawSql.split(";");
	}

	const sqlQueries = statements
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	await client.batch(
		sqlQueries.map((s) => ({ sql: s, args: [] })),
		"write",
	);
	console.log(`✓ seeded ${sqlQueries.length} statement(s) into ${url}`);
	await client.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
