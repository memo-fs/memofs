import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import HomeLayout from "./components/HomeLayout.vue";
import "./custom.css";

export default {
	extends: DefaultTheme,
	Layout: HomeLayout,
} satisfies Theme;
