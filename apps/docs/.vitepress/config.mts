import { defineConfig } from "vitepress";
import { head } from "./config/head.mts";
import { nav } from "./config/nav.mts";
import { sidebar } from "./config/sidebar.mts";
import { site } from "./config/site.mts";

export default defineConfig({
	lang: "en-US",
	title: site.title,
	titleTemplate: ":title | TekMemo",
	description: site.description,
	base: "/",
	cleanUrls: true,
	lastUpdated: true,
	ignoreDeadLinks: false,
	head,
	markdown: {
		lineNumbers: true,
		theme: { light: "github-light", dark: "github-dark" },
		container: {
			tipLabel: "TIP",
			warningLabel: "WARNING",
			dangerLabel: "DANGER",
		},
	},
	themeConfig: {
		logo: { light: "/logo.svg", dark: "/logo.svg", alt: "TekMemo" },
		siteTitle: "TekMemo",
		nav,
		sidebar,
		search: { provider: "local" },
		outline: { level: [2, 3], label: "On this page" },
		socialLinks: [
			{ icon: "github", link: site.repo, ariaLabel: "TekMemo on GitHub" },
			{ icon: "npm", link: site.npm, ariaLabel: "TekMemo on npm" },
			{ icon: "x", link: site.x, ariaLabel: "TekBreed on X" },
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
			message: `Released under the ${site.license} License.`,
			copyright: "Copyright © 2026-present TekMemo",
		},
	},
});
