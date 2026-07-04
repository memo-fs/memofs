import type { DefaultTheme } from "vitepress";

const cli = [{ text: "", link: "" }];
const mcp = [{ text: "", link: "" }];
const api = [{ text: "", link: "" }];

const tekmemo = [
	// @tekmemo/core docs will go here

	// @tekmemo docs will go here
	{ text: "CLI", items: cli },

	// @tekmemo/mcp-server docs will go here
	{ text: "MCP Server", items: mcp },

	// Other packages docs here
];

export const sidebar: DefaultTheme.Sidebar = {
	"/": [{ text: "Core Runtime", items: tekmemo }],
	"/api/": [{ text: "API", items: api }],
};
