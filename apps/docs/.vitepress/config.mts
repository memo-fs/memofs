import { defineConfig } from "vitepress";
import { head } from "./config/head.mts";
import { nav } from "./config/nav.mts";
import { sidebar } from "./config/sidebar.mts";
import { site } from "./config/site.mts";

export default defineConfig({
	lang: "en-US",
	title: site.title,
	titleTemplate: ":title | TekMemo Docs",
	description: site.description,
	base: "/",
	cleanUrls: true,
	lastUpdated: true,
	ignoreDeadLinks: false,
	head,
	markdown: {
		lineNumbers: true,
		theme: { light: "github-light", dark: "github-dark" },
	},
	themeConfig: {
		logo: { light: "/tekmemo.svg", dark: "/tekmemo.svg", alt: "TekMemo" },
		siteTitle: "TekMemo Docs",
		nav,
		sidebar,
		search: { provider: "local" },
		outline: { level: [2, 3], label: "On this page" },
		socialLinks: [
			{ icon: "github", link: site.repo, ariaLabel: "TekMemo on GitHub" },
			{ icon: "npm", link: site.npm, ariaLabel: "TekMemo on npm" },
		],
		editLink: {
			pattern: `${site.repo}/edit/main/apps/docs/:path`,
			text: "Edit this page on GitHub",
		},
		lastUpdated: {
			text: "Updated",
			formatOptions: { dateStyle: "medium", timeStyle: "short" },
		},
		docFooter: { prev: "Previous", next: "Next" },
		footer: {
			message: `Released under the ${site.license} License. Product, pricing, legal, blog, and changelog content live in TekMemo Cloud.`,
			copyright: "Copyright © 2026-present TekBreed",
		},
	},
});
