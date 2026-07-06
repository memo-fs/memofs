#!/usr/bin/env node
import { spawn } from "node:child_process";

// 1. Start the local database in the background using dev-db.mjs
const dbProcess = spawn("node", ["scripts/dev-db.mjs"], { stdio: "inherit" });

const DB_URL = "http://127.0.0.1:8080";

/** Polls the sqld health endpoint until it answers. */
async function waitForDb(ms = 8000) {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${DB_URL}/health`);
			if (res.ok || res.status === 404) {
				return true;
			}
		} catch {
			// keep polling
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	return false;
}

async function start() {
	console.log("[dev] Waiting for local database...");
	const ready = await waitForDb();
	if (!ready) {
		console.error(
			"[dev] Database failed to start, starting dev server anyway...",
		);
	} else {
		console.log(
			"[dev] Database is ready. Starting React Router dev server...\n",
		);
	}

	// 2. Start the dev server
	const appProcess = spawn("npx", ["react-router", "dev"], {
		stdio: "inherit",
		shell: true,
	});

	// Cleanup on exit
	appProcess.on("exit", (code) => {
		dbProcess.kill("SIGTERM");
		process.exit(code ?? 0);
	});

	process.on("SIGINT", () => {
		appProcess.kill("SIGINT");
		dbProcess.kill("SIGINT");
		process.exit(0);
	});

	process.on("SIGTERM", () => {
		appProcess.kill("SIGTERM");
		dbProcess.kill("SIGTERM");
		process.exit(0);
	});
}

start();
