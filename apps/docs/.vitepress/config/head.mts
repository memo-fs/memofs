import type { HeadConfig } from "vitepress";
import { site } from "./site.mts";

export const head: HeadConfig[] = [
	["meta", { name: "theme-color", content: "#2563eb" }],
	["meta", { property: "og:title", content: "TekBreed OSS" }],
	["meta", { property: "og:description", content: site.description }],
	["meta", { property: "og:type", content: "website" }],
	["link", { rel: "icon", href: "/logo.svg" }],
];
