import type { LocaleSpecificConfig } from "vitepress";
import { nav } from "../nav.mts";
import { sidebar } from "../sidebar.mts";
import { site } from "../site.mts";

export const enLocale: LocaleSpecificConfig = {
	title: site.title,
	description: site.description,
	themeConfig: {
		nav,
		sidebar,
		outline: {
			level: [2, 3],
			label: "On this page",
		},
		docFooter: {
			prev: "Previous",
			next: "Next",
		},
		lastUpdated: {
			text: "Updated",
			formatOptions: {
				dateStyle: "medium",
				timeStyle: "short",
			},
		},
		editLink: {
			pattern: `${site.repo}/edit/main/apps/docs/:path`,
			text: "Edit this page on GitHub",
		},
		footer: {
			message: `Released under the ${site.license} License.`,
			copyright: "Copyright © 2026-present MemoFS",
		},
	},
};
