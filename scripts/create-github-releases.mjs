#!/usr/bin/env node

/**
 * create-github-releases.mjs
 *
 * After `changeset publish` creates git tags, this script creates a GitHub
 * Release for each newly-tagged package with the relevant CHANGELOG.md section
 * as the release body.
 *
 * Usage (called from the release workflow):
 *   node scripts/create-github-releases.mjs
 *
 * Prerequisites:
 *   - `gh` CLI authenticated with `contents: write` permission
 *   - Git tags created by `changeset publish` pointing at HEAD
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

/**
 * Build a map of package name → directory by reading package.json files
 * from packages/* (and sdks/* when they exist).
 */
function discoverPackages() {
	/** @type {Map<string, string>} */
	const map = new Map();

	const dirs = ["packages"];

	// Future: sdks/* for Python, Rust, Go
	if (existsSync(join(ROOT, "sdks"))) {
		dirs.push("sdks");
	}

	for (const base of dirs) {
		const baseDir = join(ROOT, base);
		if (!existsSync(baseDir)) continue;

		for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;

			const pkgJsonPath = join(baseDir, entry.name, "package.json");
			if (existsSync(pkgJsonPath)) {
				try {
					const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
					if (pkg.name && pkg.private !== true) {
						map.set(pkg.name, join(base, entry.name));
					}
				} catch {
					// Skip malformed package.json
				}
			}

			// TODO: Support pyproject.toml (Python), Cargo.toml (Rust), go.mod (Go)
			// when polyglot SDKs are added under sdks/
		}
	}

	return map;
}

/**
 * Extract the changelog section for a specific version from a CHANGELOG.md file.
 *
 * Looks for `## <version>` and captures everything until the next `## ` heading.
 */
function extractChangelogSection(changelogPath, version) {
	if (!existsSync(changelogPath)) {
		return null;
	}

	const content = readFileSync(changelogPath, "utf-8");
	const lines = content.split("\n");

	let capturing = false;
	const sectionLines = [];

	for (const line of lines) {
		if (line.startsWith("## ") && !capturing) {
			// Match both `## 1.4.0` and `## 1.4.0-beta.1` formats
			const heading = line.replace("## ", "").trim();
			if (heading === version) {
				capturing = true;
				continue;
			}
		} else if (line.startsWith("## ") && capturing) {
			// Hit the next version section — stop
			break;
		}

		if (capturing) {
			sectionLines.push(line);
		}
	}

	const section = sectionLines.join("\n").trim();
	return section || null;
}

/**
 * Parse a tag like `@memofs/core@1.4.0` into { name, version }.
 */
function parseTag(tag) {
	// Handle scoped packages: @scope/name@version
	const match = tag.match(/^(@[^@]+)@(.+)$/);
	if (!match) return null;
	return { name: match[1], version: match[2] };
}

/**
 * Check if a version string is a pre-release.
 */
function isPrerelease(version) {
	return /-(alpha|beta|rc|next|canary|dev|preview)\b/i.test(version);
}

async function main() {
	console.log("🔍 Discovering packages...");
	const packages = discoverPackages();
	console.log(`   Found ${packages.size} publishable packages\n`);

	// Get tags pointing at HEAD
	let tags;
	try {
		const output = execSync("git tag --points-at HEAD", {
			encoding: "utf-8",
			cwd: ROOT,
		}).trim();

		tags = output ? output.split("\n").filter(Boolean) : [];
	} catch {
		console.log("⚠️  Could not read git tags. Exiting.");
		process.exit(0);
	}

	if (tags.length === 0) {
		console.log("ℹ️  No tags found at HEAD. Nothing to release.");
		process.exit(0);
	}

	console.log(`📦 Found ${tags.length} tag(s) at HEAD:\n`);

	let created = 0;
	let failed = 0;

	for (const tag of tags) {
		const parsed = parseTag(tag);
		if (!parsed) {
			console.log(`   ⏭️  Skipping non-package tag: ${tag}`);
			continue;
		}

		const { name, version } = parsed;
		const pkgDir = packages.get(name);

		if (!pkgDir) {
			console.log(`   ⏭️  Skipping unknown package: ${name}`);
			continue;
		}

		const changelogPath = join(ROOT, pkgDir, "CHANGELOG.md");
		const body = extractChangelogSection(changelogPath, version);
		const title = `${name} v${version}`;

		console.log(`   📝 Creating release: ${title}`);

		const args = [
			"gh",
			"release",
			"create",
			tag,
			"--title",
			title,
			"--verify-tag",
		];

		if (isPrerelease(version)) {
			args.push("--prerelease");
		}

		if (body) {
			args.push("--notes", body);
		} else {
			args.push(
				"--notes",
				`Released ${name} v${version}. See [CHANGELOG](https://github.com/memo-fs/memofs/blob/main/${pkgDir}/CHANGELOG.md) for details.`,
			);
		}

		try {
			execSync(args.join(" "), {
				cwd: ROOT,
				stdio: "pipe",
				encoding: "utf-8",
			});
			console.log(`      ✅ Created: ${title}`);
			created++;
		} catch (err) {
			// gh release create fails if the release already exists — that's OK
			if (err.stderr?.includes("already exists")) {
				console.log(`      ⏭️  Already exists: ${title}`);
			} else {
				console.error(`      ❌ Failed: ${title}`, err.stderr || err.message);
				failed++;
			}
		}
	}

	console.log(
		`\n🏁 Done. Created: ${created}, Failed: ${failed}, Skipped: ${tags.length - created - failed}`,
	);

	if (failed > 0) {
		process.exit(1);
	}
}

main();
