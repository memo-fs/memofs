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
		text: "Cloud",
		link: "https://memofs.dev",
	},
];
