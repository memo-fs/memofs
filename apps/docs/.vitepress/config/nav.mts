import type { DefaultTheme } from "vitepress";

export const nav: DefaultTheme.NavItem[] = [
	{ text: "Start", link: "/guide/getting-started", activeMatch: "/guide/" },
	{ text: "Packages", link: "/packages/", activeMatch: "/packages/" },
	{ text: "CLI", link: "/cli/", activeMatch: "/cli/" },
	{ text: "MCP", link: "/mcp/", activeMatch: "/mcp/" },
	{
		text: "Cloud Client",
		link: "/cloud-client/",
		activeMatch: "/cloud-client/",
	},
	{ text: "AI SDK", link: "/ai-sdk/", activeMatch: "/ai-sdk/" },
	{ text: "Examples", link: "/examples/", activeMatch: "/examples/" },
	{
		text: "Reference",
		items: [
			{ text: "Architecture", link: "/architecture/" },
			{ text: "Configuration", link: "/reference/configuration" },
			{ text: "Errors", link: "/reference/errors" },
			{ text: "Glossary", link: "/reference/glossary" },
		],
	},
];
