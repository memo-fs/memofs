#!/usr/bin/env node

/**
 * validate-changesets.mjs
 *
 * CI guard that prevents batch changesets from sneaking back in.
 * Validates that changeset files follow independent-versioning conventions.
 *
 * Usage:
 *   node scripts/validate-changesets.mjs
 *
 * Rules:
 *   - ERROR if a changeset lists ALL publishable packages (batch changeset)
 *   - WARN  if a changeset lists more than 5 packages (likely a batch changeset)
 *   - ERROR if a listed package doesn't exist in the workspace (typo guard)
 *
 * Exit code 0 if no errors, 1 if any errors.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const CHANGESET_DIR = join(ROOT, ".changeset");

// Threshold for warning about too many packages in a single changeset
const WARN_PACKAGE_COUNT = 5;

/**
 * Discover all publishable (non-private) package names in the workspace.
 */
function discoverPublishablePackages() {
	/** @type {Set<string>} */
	const names = new Set();

	const searchDirs = ["packages", "sdks"];

	for (const base of searchDirs) {
		const baseDir = join(ROOT, base);
		if (!existsSync(baseDir)) continue;

		for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;

			const pkgJsonPath = join(baseDir, entry.name, "package.json");
			if (existsSync(pkgJsonPath)) {
				try {
					const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
					if (pkg.name && pkg.private !== true) {
						names.add(pkg.name);
					}
				} catch {
					// Skip malformed package.json
				}
			}
		}
	}

	return names;
}

/**
 * Parse YAML frontmatter from a changeset markdown file.
 * Returns an array of package names listed in the frontmatter.
 *
 * Format:
 * ```
 * ---
 * "@memofs/core": minor
 * "@memofs/cli": patch
 * ---
 * ```
 */
function parseChangesetPackages(content) {
	const lines = content.split("\n");
	/** @type {string[]} */
	const packages = [];

	let inFrontmatter = false;

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed === "---") {
			if (!inFrontmatter) {
				inFrontmatter = true;
				continue;
			}
			// End of frontmatter
			break;
		}

		if (inFrontmatter && trimmed) {
			// Parse lines like: "@memofs/core": minor
			// or: "@memofs/core": patch
			const match = trimmed.match(/^"([^"]+)":\s*(major|minor|patch)$/);
			if (match) {
				packages.push(match[1]);
			}
		}
	}

	return packages;
}

function main() {
	const publishable = discoverPublishablePackages();

	if (publishable.size === 0) {
		console.log("⚠️  No publishable packages found. Skipping validation.");
		process.exit(0);
	}

	console.log(
		`📦 Found ${publishable.size} publishable packages in workspace\n`,
	);

	// Find all changeset markdown files
	if (!existsSync(CHANGESET_DIR)) {
		console.log("ℹ️  No .changeset directory found. Nothing to validate.");
		process.exit(0);
	}

	const changesetFiles = readdirSync(CHANGESET_DIR).filter(
		(f) => f.endsWith(".md") && f !== "README.md",
	);

	if (changesetFiles.length === 0) {
		console.log("ℹ️  No changeset files found. Nothing to validate.");
		process.exit(0);
	}

	let errors = 0;
	let warnings = 0;

	for (const file of changesetFiles) {
		const filePath = join(CHANGESET_DIR, file);
		const content = readFileSync(filePath, "utf-8");
		const packages = parseChangesetPackages(content);

		if (packages.length === 0) {
			// Empty changeset or no frontmatter — skip silently
			continue;
		}

		// Check for unknown packages
		for (const pkg of packages) {
			if (!publishable.has(pkg)) {
				console.error(
					`❌ ERROR [${file}]: Unknown package "${pkg}" — not found in workspace`,
				);
				errors++;
			}
		}

		// Check for batch changesets (all packages listed)
		const knownPackages = packages.filter((p) => publishable.has(p));
		if (knownPackages.length === publishable.size && publishable.size > 1) {
			console.error(
				`❌ ERROR [${file}]: Lists ALL ${publishable.size} publishable packages — this is a batch changeset. ` +
					`Split into per-feature changesets that list only affected packages.`,
			);
			errors++;
		} else if (knownPackages.length > WARN_PACKAGE_COUNT) {
			console.warn(
				`⚠️  WARN  [${file}]: Lists ${knownPackages.length} packages (threshold: ${WARN_PACKAGE_COUNT}). ` +
					`Consider splitting into smaller, feature-scoped changesets.`,
			);
			warnings++;
		}
	}

	console.log(
		`\n📋 Validated ${changesetFiles.length} changeset file(s): ${errors} error(s), ${warnings} warning(s)`,
	);

	if (errors > 0) {
		process.exit(1);
	}
}

main();
