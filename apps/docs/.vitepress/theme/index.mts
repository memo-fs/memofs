import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import SidebarBrand from "./components/SidebarBrand.vue";
import "./custom.css";

export default {
	extends: DefaultTheme,
	Layout() {
		return h(DefaultTheme.Layout, null, {
			"sidebar-nav-before": () => h(SidebarBrand),
		});
	},
} satisfies Theme;
