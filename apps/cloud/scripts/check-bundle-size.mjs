#!/usr/bin/env node
/**
 * Bundle-size guard for the two-Worker split (ADR 0013).
 *
 * @remarks
 * The free-plan 3 MB (compressed) Worker cap is the load-bearing constraint
 * that forced the split. This script runs `wrangler deploy --dry-run` against
 * each Worker config and parses the reported gzip size, failing if either
 * exceeds the cap. Run before deploy / in CI.
 *
 * The runtime Worker (`wrangler.runtime.jsonc`) is the critical proof — it
 * carries the `Tekmemo` engine + the R2/Voyage/Workers AI adapters, the bundle
 * that previously pushed the single Worker past 3 MB. The commercial Worker
 * (`wrangler.jsonc`) needs its built assets (`build/client`) present, so it is
 * checked after `pnpm build`; when assets are absent the script skips it with
 * a clear note rather than failing falsely.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

/** The Cloudflare free-plan compressed Worker cap (3 MB). */
const CAP_BYTES = 3 * 1024 * 1024;

/** The directory the commercial Worker serves as static assets. */
const ASSETS_DIR = "build/client";

/**
 * Runs `wrangler deploy --dry-run` against a config + parses the gzip size.
 *
 * @param config - The wrangler config path (e.g. `wrangler.runtime.jsonc`).
 * @returns the gzipped Worker size in bytes, or `undefined` if wrangler failed
 *   for a known reason (missing assets).
 */
function dryRunGzipSize(config) {
	try {
		const output = execFileSync("npx", ["wrangler", "deploy", "--dry-run", "--config", config], {
			encoding: "utf8",
			stderr: "pipe",
		});
		// wrangler prints "Total Upload: 584.73 KiB / gzip: 122.00 KiB".
		const match = output.match(/gzip:\s*([\d.]+)\s*(KiB|MiB)/i);
		if (!match) return undefined;
		const value = Number.parseFloat(match[1]);
		const unit = match[2].toLowerCase();
		return unit === "mib" ? value * 1024 * 1024 : value * 1024;
	} catch {
		return undefined;
	}
}

/**
 * Formats bytes as a human-readable MB string.
 *
 * @param bytes - The byte count.
 */
function fmt(bytes) {
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Main: check both Workers, exit non-zero if a checked Worker exceeds the cap.
 */
function main() {
	const checks = [
		{ name: "runtime (tekmemo-cloud-runtime)", config: "wrangler.runtime.jsonc", requiresAssets: false },
		{ name: "commercial (tekmemo-cloud)", config: "wrangler.jsonc", requiresAssets: true },
	];
	let failed = false;
	for (const { name, config, requiresAssets } of checks) {
		if (requiresAssets && !existsSync(ASSETS_DIR)) {
			console.log(`  - ${name}: skipped (run \`pnpm build\` first — ${ASSETS_DIR} absent)`);
			continue;
		}
		const size = dryRunGzipSize(config);
		if (size === undefined) {
			console.log(`  ? ${name}: could not parse wrangler output (check manually)`);
			continue;
		}
		const pct = ((size / CAP_BYTES) * 100).toFixed(0);
		const ok = size < CAP_BYTES;
		failed = failed || !ok;
		console.log(`  ${ok ? "✓" : "✗"} ${name}: ${fmt(size)} — ${pct}% of the 3 MB cap`);
	}
	if (failed) {
		console.error("\n✗ A Worker bundle exceeds the 3 MB free-plan cap.");
		process.exit(1);
	}
	console.log("\n✓ All checked Worker bundles are under the 3 MB cap.");
}

main();
