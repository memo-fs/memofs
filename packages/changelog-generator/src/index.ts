/**
 * Custom Changeset changelog generator for the TekMemo monorepo.
 *
 * @remarks
 * Wraps `@changesets/changelog-github` to provide rich GitHub links (PRs,
 * commits, authors) in changelog entries while producing clean per-package
 * changelogs. Falls back to a plain-text renderer when `GITHUB_TOKEN` is not
 * available or when the GitHub API call fails, so `changeset version` never
 * blocks on missing credentials.
 *
 * The root-level aggregated changelog is handled separately by
 * `scripts/aggregate-changelog.ts` (run via `pnpm changelog:aggregate`).
 *
 * @internal
 */

import githubChangelog from "@changesets/changelog-github";
import type {
	ChangelogFunctions,
	ModCompWithPackage,
	NewChangesetWithCommit,
	VersionType,
} from "@changesets/types";

/**
 * Format a single changeset's release line without GitHub links.
 *
 * @param changeset - The changeset with its summary and optional commit hash.
 * @param type - The semver bump type for this release.
 * @returns A markdown string representing this changeset entry.
 */
const getReleaseLinePlain = async (
	changeset: NewChangesetWithCommit,
	_type: VersionType,
	_options: unknown,
): Promise<string> => {
	const [firstLine, ...futureLines] = changeset.summary
		.split("\n")
		.map((l) => l.trimRight());
	const prefix = changeset.commit ? `${changeset.commit.slice(0, 7)}: ` : "";
	let returnVal = `- ${prefix}${firstLine}`;
	if (futureLines.length > 0) {
		returnVal += `\n${futureLines.map((l) => `  ${l}`).join("\n")}`;
	}
	return returnVal;
};

/**
 * Format the "Updated dependencies" section without GitHub links.
 *
 * @param changesets - The changesets that caused dependency bumps.
 * @param dependenciesUpdated - The packages whose versions were bumped.
 * @returns A markdown string listing updated dependencies, or empty string.
 */
const getDependencyReleaseLinePlain = async (
	changesets: NewChangesetWithCommit[],
	dependenciesUpdated: ModCompWithPackage[],
	_options: unknown,
): Promise<string> => {
	if (dependenciesUpdated.length === 0) return "";

	const updatedList = dependenciesUpdated
		.map((dep) => `  - ${dep.name}@${dep.newVersion}`)
		.join("\n");

	const commitSuffix = changesets
		.filter((c) => c.commit)
		.map((c) => c.commit?.slice(0, 7))
		.join(", ");

	const header = commitSuffix
		? `- Updated dependencies [${commitSuffix}]`
		: "- Updated dependencies";

	return [header, updatedList].join("\n");
};

const plainFunctions: ChangelogFunctions = {
	getReleaseLine: getReleaseLinePlain,
	getDependencyReleaseLine: getDependencyReleaseLinePlain,
};

/**
 * Determine whether GitHub-enhanced changelog generation is available.
 *
 * @returns `true` when `GITHUB_TOKEN` is set in the environment.
 */
const hasGitHubToken = (): boolean => Boolean(process.env.GITHUB_TOKEN);

const changelogFunctions: ChangelogFunctions = {
	getReleaseLine: async (changeset, type, options) => {
		if (!hasGitHubToken()) {
			return plainFunctions.getReleaseLine(changeset, type, options);
		}
		try {
			return await githubChangelog.getReleaseLine(changeset, type, options);
		} catch {
			return plainFunctions.getReleaseLine(changeset, type, options);
		}
	},

	getDependencyReleaseLine: async (
		changesets,
		dependenciesUpdated,
		options,
	) => {
		if (!hasGitHubToken()) {
			return plainFunctions.getDependencyReleaseLine(
				changesets,
				dependenciesUpdated,
				options,
			);
		}
		try {
			return await githubChangelog.getDependencyReleaseLine(
				changesets,
				dependenciesUpdated,
				options,
			);
		} catch {
			return plainFunctions.getDependencyReleaseLine(
				changesets,
				dependenciesUpdated,
				options,
			);
		}
	},
};

export default changelogFunctions;
