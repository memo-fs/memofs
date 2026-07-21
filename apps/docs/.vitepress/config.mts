import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

import { head } from "./config/head.mts";
import { nav } from "./config/nav.mts";
import { sidebar } from "./config/sidebar.mts";
import { site } from "./config/site.mts";

export default withMermaid(
	defineConfig({
		lang: "en-US",

		vite: {
			optimizeDeps: {
				include: ["mermaid", "dayjs"],
			},
			resolve: {
				alias: {
					"@": fileURLToPath(new URL("..", import.meta.url)),
				},
			},
		},

		title: site.title,
		titleTemplate: ":title | MemoFS",
		description: site.description,

		base: "/",
		cleanUrls: true,
		lastUpdated: true,
		ignoreDeadLinks: false,
		srcExclude: ["**/includes/**"],

		head,

		markdown: {
			theme: {
				light: "github-light",
				dark: "github-dark",
			},
			container: {
				tipLabel: "TIP",
				warningLabel: "WARNING",
				dangerLabel: "DANGER",
			},
		},

		themeConfig: {
			logo: {
				light: "/logo.svg",
				dark: "/logo.svg",
				alt: "MemoFS",
			},

			siteTitle: "MemoFS",

			nav,
			sidebar,

			search: {
				provider: "local",
			},

			outline: {
				level: [2, 3],
				label: "On this page",
			},

			socialLinks: [
				{
					icon: "github",
					link: site.repo,
					ariaLabel: "MemoFS on GitHub",
				},
				{
					icon: "x",
					link: site.x,
					ariaLabel: "MemoFS on X",
				},
				{
					icon: "bluesky",
					link: site.bluesky,
					ariaLabel: "MemoFS on Bluesky",
				},
				{
					icon: "youtube",
					link: site.youtube,
					ariaLabel: "MemoFS on YouTube",
				},
			],

			editLink: {
				pattern: `${site.repo}/edit/main/apps/docs/:path`,
				text: "Edit this page on GitHub",
			},

			lastUpdated: {
				text: "Updated",
				formatOptions: {
					dateStyle: "medium",
					timeStyle: "short",
				},
			},

			docFooter: {
				prev: "Previous",
				next: "Next",
			},

			footer: {
				message: `Released under the ${site.license} License.`,
				copyright: "Copyright © 2026-present MemoFS",
			},
		},

		mermaid: {
			startOnLoad: true,
			theme: "base",
			themeVariables: {
				darkMode: true,
			},
		},

		mermaidPlugin: {
			class: "mermaid",
		},
	}),
);
