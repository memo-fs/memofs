import type { DefaultTheme } from "vitepress";
import { getVersionNav } from "./versions.mts";

export const nav: DefaultTheme.NavItem[] = [
	{
		text: "Get Started",
		link: "/introduction",
		activeMatch: "/introduction",
	},
	{
		text: "API",
		link: "/api/",
		activeMatch: "/api/",
	},
	{
		text: "Learn",
		items: [
			{ text: "Cookbooks", link: "/learn/cookbooks/" },
			{ text: "Tracks", link: "/learn/tracks/" },
		],
		activeMatch: "/learn/",
	},
	{
		text: "Community",
		items: [
			{ text: "Roadmap", link: "/community/roadmap" },
			{ text: "Contributing", link: "/community/contributing" },
			{
				text: "GitHub Discussions",
				link: "https://github.com/memo-fs/memofs/discussions",
			},
			{
				text: "Good First Issues",
				link: "https://github.com/memo-fs/memofs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22",
			},
		],
		activeMatch: "/community/",
	},
	{
		text: "Cloud",
		link: "https://memofs.dev",
	},
	getVersionNav(),
];
