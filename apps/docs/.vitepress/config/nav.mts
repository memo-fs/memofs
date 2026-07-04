import type { DefaultTheme } from "vitepress";

export const nav: DefaultTheme.NavItem[] = [
	{
		text: "Get Started",
		link: "/packages/tekmemo",
		activeMatch: "/packages/tekmemo/",
	},
	{
		text: "API",
		link: "/api/tekmemo",
		activeMatch: "/api/tekmemo/",
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
		link: "https://memo.tekbreed.com",
	},
];
