/**
 * Aggregate changelog script for the TekMemo monorepo.
 *
 * @remarks
 * Reads all public OSS package changelogs (`tekmemo` + `@tekmemo/*`),
 * parses their version entries, and produces a root-level `CHANGELOG.md`
 * grouped by release version (release-oriented format).
 *
 * Run via: `pnpm changelog:aggregate`
 *
 * The script is idempotent — it fully regenerates the root changelog each time.
 *
 * @internal
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface VersionEntry {
	version: string;
	packageName: string;
	content: string;
}

interface GroupedRelease {
	version: string;
	entries: VersionEntry[];
}

const PACKAGES_DIR = resolve(__dirname, "..", "packages");
const ROOT_CHANGELOG_PATH = resolve(__dirname, "..", "CHANGELOG.md");

const PUBLIC_PACKAGE_PREFIXES = ["tekmemo", "@tekmemo/"];

/**
 * Check if a package name is a public OSS package.
 *
 * @param name - The package name from package.json.
 * @returns True if the package is public OSS (tekmemo or @tekmemo/*).
 */
function isPublicPackage(name: string): boolean {
	return PUBLIC_PACKAGE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * Read the package name from a package.json file.
 *
 * @param pkgDir - The directory path of the package.
 * @returns The package name, or null if the file doesn't exist or isn't public.
 */
function getPackageName(pkgDir: string): string | null {
	try {
		const pkgJson = JSON.parse(
			readFileSync(join(pkgDir, "package.json"), "utf-8"),
		);
		if (pkgJson.private === true || !isPublicPackage(pkgJson.name ?? "")) {
			return null;
		}
		return pkgJson.name;
	} catch {
		return null;
	}
}

/**
 * Parse a package's CHANGELOG.md into version entries.
 *
 * @param content - The raw CHANGELOG.md content.
 * @param packageName - The package name for attribution.
 * @returns An array of version entries with their markdown content.
 */
function parseChangelog(content: string, packageName: string): VersionEntry[] {
	const lines = content.split("\n");
	const entries: VersionEntry[] = [];
	let currentVersion = "";
	let currentContentLines: string[] = [];

	for (const line of lines) {
		const versionMatch = /^## (\d+\.\d+\.\d+)/.exec(line);
		if (versionMatch) {
			if (currentVersion) {
				entries.push({
					version: currentVersion,
					packageName,
					content: currentContentLines.join("\n").trim(),
				});
			}
			currentVersion = versionMatch[1] ?? "";
			currentContentLines = [];
		} else if (currentVersion) {
			currentContentLines.push(line);
		}
	}

	if (currentVersion) {
		entries.push({
			version: currentVersion,
			packageName,
			content: currentContentLines.join("\n").trim(),
		});
	}

	return entries;
}

/**
 * Group version entries by release version.
 *
 * @param allEntries - All version entries from all packages.
 * @returns Entries grouped by version, sorted newest-first.
 */
function groupByVersion(allEntries: VersionEntry[]): GroupedRelease[] {
	const map = new Map<string, VersionEntry[]>();

	for (const entry of allEntries) {
		const existing = map.get(entry.version) ?? [];
		existing.push(entry);
		map.set(entry.version, existing);
	}

	const sorted = [...map.entries()].sort((a, b) => compareVersions(b[0], a[0]));

	return sorted.map(([version, entries]) => ({
		version,
		entries: entries.sort((a, b) => a.packageName.localeCompare(b.packageName)),
	}));
}

/**
 * Compare two semver version strings.
 *
 * @param a - First version string.
 * @param b - Second version string.
 * @returns Negative if a < b, positive if a > b, zero if equal.
 */
function compareVersions(a: string, b: string): number {
	const partsA = a.split(".").map(Number);
	const partsB = b.split(".").map(Number);

	for (let i = 0; i < 3; i++) {
		const partA = partsA[i] ?? 0;
		const partB = partsB[i] ?? 0;
		if (partA !== partB) return partA - partB;
	}

	return 0;
}

/**
 * Render a single package's changes section for the root changelog.
 *
 * @remarks
 * Handles both old-format changelogs (where the default `@changesets/cli/changelog`
 * generator dumped every package's changes under `#### other-package` sub-headers)
 * and new-format changelogs produced by `@repo/changelog-generator` which only
 * include the package's own changes.
 *
 * For old-format entries, only lines belonging to this package are included.
 * Cross-package `#### other-package` sub-headers and their content are filtered out.
 *
 * @param entry - The version entry for one package.
 * @returns A markdown string for the package's section.
 */
function renderPackageSection(entry: VersionEntry): string {
	const lines = [`### ${entry.packageName}`];
	const contentLines = entry.content.split("\n").filter((l) => l.trim() !== "");

	let inOwnSection = true;
	let currentSectionType = "";

	for (const line of contentLines) {
		const sectionMatch = /^### (.+)/.exec(line);
		if (sectionMatch) {
			currentSectionType = sectionMatch[1]?.trim();
			const formattedType =
				currentSectionType.charAt(0).toUpperCase() +
				currentSectionType.slice(1);
			lines.push("", `**${formattedType}**`);
			inOwnSection = true;
			continue;
		}

		const subPackageMatch = /^-?\s*#### (.+)/.exec(line);
		if (subPackageMatch) {
			const subPkg = subPackageMatch[1]?.trim();
			inOwnSection = isOwnChange(entry.packageName, subPkg);
			continue;
		}

		if (inOwnSection) {
			lines.push(line);
		}
	}

	return lines.join("\n");
}

/**
 * Check if a `#### package-name` sub-header belongs to the given package.
 *
 * @remarks
 * The default changeset generator uses bare package names like `#### tekmemo`
 * and scoped names like `#### @tekmemo/agentfs`. This function normalizes
 * the comparison to handle both forms.
 *
 * @param packageName - The full package name (e.g. `tekmemo` or `@tekmemo/fs`).
 * @param subHeader - The text after `#### ` in the changelog.
 * @returns True if the sub-header refers to this package's own changes.
 */
function isOwnChange(packageName: string, subHeader: string): boolean {
	if (subHeader === packageName) return true;
	if (packageName.startsWith("@tekmemo/")) {
		const shortName = packageName.replace("@tekmemo/", "");
		if (subHeader === shortName) return true;
	}
	return false;
}

/**
 * Render the entire root changelog from grouped releases.
 *
 * @param releases - All releases grouped by version.
 * @returns The complete root CHANGELOG.md content.
 */
function renderRootChangelog(releases: GroupedRelease[]): string {
	const lines = ["# TekMemo Changelog", ""];

	for (const release of releases) {
		lines.push(`## ${release.version}`);
		lines.push("");

		for (const entry of release.entries) {
			lines.push(renderPackageSection(entry));
			lines.push("");
		}
	}

	return `${lines.join("\n").trimEnd()}\n`;
}

/**
 * Collect all changelog entries from public packages.
 *
 * @returns All version entries from all public OSS packages.
 */
function collectEntries(): VersionEntry[] {
	const allEntries: VersionEntry[] = [];

	const dirs = readdirSync(PACKAGES_DIR);
	for (const dir of dirs) {
		const pkgDir = join(PACKAGES_DIR, dir);
		if (!statSync(pkgDir).isDirectory()) continue;

		const packageName = getPackageName(pkgDir);
		if (!packageName) continue;

		const changelogPath = join(pkgDir, "CHANGELOG.md");
		try {
			const content = readFileSync(changelogPath, "utf-8");
			const entries = parseChangelog(content, packageName);
			allEntries.push(...entries);
		} catch {
			// No changelog for this package — skip
		}
	}

	return allEntries;
}

const entries = collectEntries();
const releases = groupByVersion(entries);
const rootChangelog = renderRootChangelog(releases);

writeFileSync(ROOT_CHANGELOG_PATH, rootChangelog, "utf-8");

console.log(
	`Root CHANGELOG.md generated with ${releases.length} release(s) from ${entries.length} package entries.`,
);
