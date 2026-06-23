import type { Theme } from "vitepress";
import { inBrowser } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { watch } from "vue";
import HomeLayout from "./components/HomeLayout.vue";
import "./custom.css";
import { GTAG_ID } from "../config/head.mts";

export default {
	extends: DefaultTheme,
	Layout: HomeLayout,
	enhanceApp({ router }) {
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
