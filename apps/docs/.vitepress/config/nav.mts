import type { DefaultTheme } from "vitepress";

export const nav: DefaultTheme.NavItem[] = [
	{
		text: "Packages",
		items: [
			{
				text: "tekmemo",
				link: "/packages/tekmemo",
				activeMatch: "/packages/tekmemo/",
			},
			{
				text: "tekmemo-cli",
				link: "/packages/cli",
				activeMatch: "/packages/cli/",
			},
			{
				text: "tekmemo-mcp",
				link: "/packages/mcp",
				activeMatch: "/packages/mcp/",
			},
		],
		activeMatch: "/packages/",
	},
	{
		text: "API",
		items: [
			{
				text: "tekmemo",
				link: "/api/tekmemo",
				activeMatch: "/api/tekmemo/",
			},
		],
		activeMatch: "/api/",
	},
	{
		text: "Reference",
		items: [
			{
				text: "tekmemo",
				link: "/reference/tekmemo",
				activeMatch: "/reference/tekmemo/",
			},
		],
		activeMatch: "/reference/",
	},
];
