import type { DefaultTheme } from "vitepress";

export const nav: DefaultTheme.NavItem[] = [
	{
		text: "TekMemo",
		items: [
			{ text: "Guide", link: "/guide/" },
			{ text: "Architecture", link: "/architecture/" },
			{ text: "API Reference", link: "/packages/" },
		],
		activeMatch: "/(guide|architecture|packages)/",
	},
	{
		text: "Agent Interfaces",
		items: [
			{ text: "CLI", link: "/cli/" },
			{ text: "MCP", link: "/mcp/" },
			{ text: "AI SDK", link: "/ai-sdk/" },
		],
		activeMatch: "/(cli|mcp|ai-sdk)/",
	},
	{
		text: "Reference",
		items: [
			{ text: "Configuration", link: "/reference/configuration" },
			{ text: "Errors", link: "/reference/errors" },
			{ text: "Glossary", link: "/reference/glossary" },
			{ text: "FAQs", link: "/reference/faqs" },
			{
				text: "Changelog",
				link: "https://github.com/tekbreed/oss/blob/main/CHANGELOG.md",
			},
		],
		activeMatch: "/reference/",
	},
];
