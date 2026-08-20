import type { HeadConfig } from "vitepress";
import { resolveImageUrl } from "./site.mts";

export const GTAG_ID = "G-D6Q96NPN7K";

export const head: HeadConfig[] = [
	// theme-color matches the true brand palette (#258acb light / #1b1b1f dark),
	// not the stray Tailwind blue-600 value it held before.
	["meta", { name: "theme-color", content: "#258acb" }],
	[
		"meta",
		{
			name: "msvalidate.01",
			content: "471697018F51A070DE0EAA3B6E96851E",
		},
	],
	// Type system — Sora (display + body) and JetBrains Mono (code / kickers),
	// matching the cloud design system. Loaded via <link> to avoid a build dep.
	["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
	[
		"link",
		{ rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
	],
	[
		"link",
		{
			rel: "stylesheet",
			href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap",
		},
	],
	["meta", { property: "og:site_name", content: "MemoFS" }],
	["meta", { property: "og:locale", content: "en_US" }],
	[
		"meta",
		{ property: "og:image", content: resolveImageUrl("/og-default.png") },
	],
	["meta", { name: "twitter:card", content: "summary_large_image" }],
	["meta", { name: "twitter:site", content: "@memofsdev" }],
	[
		"meta",
		{ name: "twitter:image", content: resolveImageUrl("/og-default.png") },
	],
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
