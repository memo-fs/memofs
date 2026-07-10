import type { Theme } from "vitepress";
import { inBrowser } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { watch } from "vue";
import BlogIndex from "./components/BlogIndex.vue";
import CopyButton from "./components/CopyButton.vue";
import HomeLayout from "./components/HomeLayout.vue";
import NewsletterSignup from "./components/NewsletterSignup.vue";
import "./custom.css";
import { GTAG_ID } from "../config/head.mts";

export default {
	extends: DefaultTheme,
	Layout: HomeLayout,
	enhanceApp({ app, router }) {
		// Used inside blog/index.md to render the data-driven post grid.
		app.component("BlogIndex", BlogIndex);
		// Newsletter signup (Plunk) — embedded in blog + changelog markdown.
		app.component("NewsletterSignup", NewsletterSignup);
		// Inline copy-to-clipboard for install commands + code snippets.
		app.component("CopyButton", CopyButton);

		if (!inBrowser) return;

		watch(
			() => router.route.path,
			(to) => {
				if ("gtag" in window && typeof window.gtag === "function") {
					window.gtag("config", `${GTAG_ID}`, {
						page_path: to,
					});
				}
			},
		);
	},
} satisfies Theme;
