import type { DefaultTheme } from "vitepress";

export const nav: DefaultTheme.NavItem[] = [
	{
		text: "Get Started",
		link: "/packages/core/",
		activeMatch: "/packages/core/",
	},
	{
		text: "API",
		link: "/api/",
		activeMatch: "/api/",
	},
	{
		text: "Blog",
		link: "/blog/",
		activeMatch: "/blog/",
	},
	{
		text: "Changelog",
		link: "/changelog",
		activeMatch: "/changelog",
	},
	{
		text: "Community",
		items: [
			{ text: "Contributing", link: "/contributing" },
			{ text: "Roadmap", link: "/roadmap" },
			{
				text: "GitHub Discussions",
				link: "https://github.com/memo-fs/memofs/discussions",
			},
			{
				text: "Good First Issues",
				link: "https://github.com/memo-fs/memofs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22",
			},
		],
	},
	{
		text: "Cloud",
		link: "https://memofs.dev",
	},
];
