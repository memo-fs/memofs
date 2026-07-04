#!/usr/bin/env node
/**
 * Starts a local libSQL (`sqld`) server for `pnpm preview` (wrangler dev).
 *
 * PROBLEM: the prod-faithful preview loop (`pnpm preview` → `wrangler dev` →
 * `workers/app.ts`) reads bindings from `wrangler.jsonc` + `.dev.vars`, NEVER from
 * `process.env` (P0.5). With no local metadata DB, every dashboard/sync request
 * that touches Turso fails — so devs fall back to `react-router dev` (which reads
 * `.env` via Vite), losing the Worker-runtime parity preview exists to provide.
 *
 * FIX: this script boots `sqld` (the libSQL server, already on PATH) on a fixed
 * HTTP port with a gitignored file backend, waits for its health endpoint, then
 * prints the `http://` URL to copy into `.dev.vars` as `DATABASE_URL`. The Worker
 * then exercises the REAL SQL the ORM emits — the same query path prod runs
 * against Turso, minus the network.
 *
 * Not a production dependency: `sqld` is invoked as a child process; it must be
 * installed on the dev machine (`brew install libsql/sqld/libsql-server` or the
 * GitHub release). The script fails loud with install guidance if `sqld` is
 * missing.
 *
 * Usage: `pnpm dev:db` (backgrounds itself; logs to `apps/cloud/.sqld/sqld.log`).
 */
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SQLD_DIR = resolve(here, "..", ".sqld");
const DB_PATH = resolve(SQLD_DIR, "data.sqld");
const LOG_PATH = resolve(SQLD_DIR, "sqld.log");
const HOST = "127.0.0.1";
const PORT = Number(process.env.TEKMEMO_DEV_DB_PORT ?? 8080);
const URL = `http://${HOST}:${PORT}`;

/** Fail loud if `sqld` isn't installed — no silent degradation. */
function ensureSqld() {
	try {
		// `which sqld` resolves the binary path synchronously; throws if absent.
		execFileSync("which", ["sqld"], { stdio: ["ignore", "ignore", "ignore"] });
	} catch {
		console.error(
			[
				"`sqld` (libSQL server) was not found on PATH.",
				"",
				"Install it for local dev:",
				"  brew install libsql/sqld/libsql-server",
				"or grab the latest release: https://github.com/tursodatabase/libsql",
				"",
				"Then re-run `pnpm dev:db`.",
			].join("\n"),
		);
		process.exit(127);
	}
}

/** Polls the sqld health endpoint until it answers (or times out). */
async function waitForReady(ms = 8000) {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${URL}/health`);
			if (res.ok || res.status === 404) {
				// sqld answers 200 on `/health`; some builds 404 on unknown routes
				// but still prove the server is up. Treat either as ready.
				return true;
			}
		} catch {
			// Not up yet — keep polling.
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	return false;
}

async function main() {
	ensureSqld();
	mkdirSync(SQLD_DIR, { recursive: true });

	const log = (await import("node:fs")).createWriteStream(LOG_PATH, {
		flags: "a",
	});
	const child = spawn(
		"sqld",
		[
			"--db-path",
			DB_PATH,
			"--http-listen-addr",
			`${HOST}:${PORT}`,
			"--enable-http-console",
		],
		// Pipe stdout/stderr so they can be tee'd to the log file below.
		{ stdio: ["ignore", "pipe", "pipe"] },
	);
	child.stdout.pipe(log);
	child.stderr.pipe(log);
	child.on("exit", (code) => {
		console.error(`sqld exited (code ${code}). See ${LOG_PATH}.`);
		process.exit(code ?? 1);
	});

	if (!(await waitForReady())) {
		console.error(
			`sqld did not become ready on ${URL} within the timeout. See ${LOG_PATH}.`,
		);
		child.kill("SIGTERM");
		process.exit(1);
	}

	// Fixed-width box: every content line is padded to `INNER` chars so the
	// right border `│` always lines up. `INNER` = total width minus the two
	// border chars and the leading two spaces.
	const INNER = 57;
	const line = (content) => `│  ${content.padEnd(INNER - 2)}│`;
	console.log(`╭${"─".repeat(INNER)}╮`);
	console.log(line("TekMemo dev libSQL (sqld) is running"));
	console.log(line(""));
	console.log(line(`URL:   ${URL}`));
	console.log(line("DB:    .sqld/data.sqld  (gitignored, persists locally)"));
	console.log(line("Logs:  .sqld/sqld.log"));
	console.log(line(`Console: ${URL}/console`));
	console.log(line(""));
	console.log(line("Put this in .dev.vars so wrangler dev binds it:"));
	console.log(line(`DATABASE_URL=${URL}`));
	console.log(`╰${"─".repeat(INNER)}╯`);
	console.log("\nPress Ctrl-C to stop the server.\n");
}

// Keep the process alive + forward Ctrl-C to the child.
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
