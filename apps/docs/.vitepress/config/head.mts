import type { HeadConfig } from "vitepress";
import { site } from "./site.mts";

export const GTAG_ID = "G-D6Q96NPN7K";

export const head: HeadConfig[] = [
	// theme-color matches the true brand palette (#258acb light / #1b1b1f dark),
	// not the stray Tailwind blue-600 value it held before.
	["meta", { name: "theme-color", content: "#258acb" }],
	["meta", { property: "og:title", content: "MemoFS" }],
	["meta", { property: "og:description", content: site.description }],
	["meta", { property: "og:type", content: "website" }],
	["meta", { property: "og:url", content: site.cloud }],
	["meta", { property: "og:image", content: "/logo.svg" }],
	["meta", { name: "twitter:card", content: "summary_large_image" }],
	["meta", { name: "twitter:title", content: "MemoFS" }],
	["meta", { name: "twitter:description", content: site.description }],
	["meta", { name: "twitter:image", content: "/logo.svg" }],
	// Modern browsers prefer the crisp SVG; .ico is the multi-size fallback.
	["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
	["link", { rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],

	[
		"script",
		{
			async: "",
			src: `https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`,
		},
	],
	[
		"script",
		{},
		`
			window.dataLayer = window.dataLayer || [];
			function gtag(){dataLayer.push(arguments);}
			gtag('js', new Date());
			gtag('config', '${GTAG_ID}');
      `,
	],
];
