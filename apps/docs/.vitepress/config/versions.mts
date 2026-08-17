import type { DefaultTheme } from "vitepress";
import { site } from "./site.mts";

export interface VersionInfo {
	version: string;
	label: string;
	link: string;
	current?: boolean;
	archived?: boolean;
}

/**
 * Current published release of MemoFS.
 * Sourced from @memofs/core package version and changelog release milestone.
 */
export const CURRENT_VERSION = "v1.3.0-beta.2";

/**
 * List of released documentation versions.
 * Currently released: v1.3.0-beta.2 (Current).
 * When new major releases (e.g. v2.0.0) ship, adding them here will automatically
 * populate the version dropdown, sidebar routing, and version notice banners.
 */
export const DOC_VERSIONS: VersionInfo[] = [
	{
		version: CURRENT_VERSION,
		label: `${CURRENT_VERSION} (Current)`,
		link: "/introduction",
		current: true,
	},
];

/**
 * Generates the navigation item for the Version dropdown in the top navbar.
 */
export function getVersionNav(): DefaultTheme.NavItemWithChildren {
	return {
		text: CURRENT_VERSION,
		items: [
			...DOC_VERSIONS.map((v) => ({
				text: v.label,
				link: v.link,
			})),
			{
				items: [
					{
						text: "Changelog",
						link: "/changelog",
					},
					{
						text: "Release Notes",
						link: `${site.repo}/releases`,
					},
				],
			},
		],
	};
}

/**
 * Helper to determine if a given URL path belongs to an archived/older version.
 */
export function isArchivedPath(path: string): boolean {
	const match = path.match(/^\/(v\d+\.\d+\.\d+(?:-[^/]+)?|\bv\d+\b)\//);
	if (!match) return false;
	const versionSlug = match[1];
	const found = DOC_VERSIONS.find(
		(v) => v.version === versionSlug || v.link.startsWith(`/${versionSlug}`),
	);
	return !!found?.archived;
}
