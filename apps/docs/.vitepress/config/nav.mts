import type { DefaultTheme } from "vitepress";

export const nav: DefaultTheme.NavItem[] = [
	{
		text: "Guide",
		link: "/guide/",
		activeMatch: "/guide/",
	},
	{ text: "Examples", link: "/examples/", activeMatch: "/examples/" },
	{
		text: "Ecosystem",
		items: [
			{ text: "CLI", link: "/cli/" },
			{ text: "MCP Server", link: "/mcp/" },
			{ text: "Cloud Client", link: "/cloud-client/" },
			{ text: "AI SDK", link: "/ai-sdk/" },
		],
		activeMatch: "/(cli|mcp|cloud-client|ai-sdk)/",
	},
	{
		text: "Reference",
		items: [
			{ text: "Packages", link: "/packages/" },
			{ text: "Architecture", link: "/architecture/" },
			{ text: "Hosting", link: "/hosting/" },
			{ text: "Configuration", link: "/reference/configuration" },
			{ text: "Errors", link: "/reference/errors" },
			{ text: "Glossary", link: "/reference/glossary" },
			{
				text: "Changelog",
				link: "https://github.com/tekbreed/tekmemo/blob/main/CHANGELOG.md",
			},
		],
		activeMatch: "/(packages|architecture|hosting|reference)/",
	},
];
