import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitepress";
import llmstxtPlugin from "vitepress-plugin-llmstxt";
import { withMermaid } from "vitepress-plugin-mermaid";

import { head } from "./config/head.mts";
import { enLocale } from "./config/locales/en.mts";
import { esLocale } from "./config/locales/es.mts";
import { jaLocale } from "./config/locales/ja.mts";
import { zhLocale } from "./config/locales/zh.mts";
import { buildPageHead } from "./config/seo.mts";
import { site } from "./config/site.mts";

export default withMermaid(
	defineConfig({
		base: "/",
		cleanUrls: true,
		lastUpdated: true,
		ignoreDeadLinks: false,

		sitemap: {
			hostname: site.url,
		},

		head,

		transformHead(ctx) {
			return buildPageHead(ctx);
		},

		locales: {
			root: {
				label: "English",
				lang: "en-US",
				...enLocale,
			},
			zh: {
				label: "简体中文",
				lang: "zh-CN",
				link: "/zh/",
				...zhLocale,
			},
			ja: {
				label: "日本語",
				lang: "ja-JP",
				link: "/ja/",
				...jaLocale,
			},
			es: {
				label: "Español",
				lang: "es-ES",
				link: "/es/",
				...esLocale,
			},
		},

		vite: {
			optimizeDeps: {
				include: ["mermaid", "dayjs"],
			},
			resolve: {
				alias: {
					"@": fileURLToPath(new URL("..", import.meta.url)),
				},
			},
			plugins: [llmstxtPlugin()],
		},

		markdown: {
			theme: {
				light: "github-light",
				dark: "github-dark",
			},
			container: {
				tipLabel: "TIP",
				warningLabel: "WARNING",
				dangerLabel: "DANGER",
			},
		},

		themeConfig: {
			logo: {
				light: "/logo.svg",
				dark: "/logo.svg",
				alt: "MemoFS",
			},

			siteTitle: "MemoFS",

			search: {
				provider: "local",
				options: {
					locales: {
						zh: {
							translations: {
								button: {
									buttonText: "搜索文档",
									buttonAriaLabel: "搜索文档",
								},
								modal: {
									noResultsText: "未找到相关结果",
									resetButtonTitle: "清除查询",
									footer: {
										selectText: "选择",
										navigateText: "切换",
										closeText: "关闭",
									},
								},
							},
						},
						ja: {
							translations: {
								button: {
									buttonText: "ドキュメントを検索",
									buttonAriaLabel: "ドキュメントを検索",
								},
								modal: {
									noResultsText: "検索結果が見つかりませんでした",
									resetButtonTitle: "リセット",
									footer: {
										selectText: "選択",
										navigateText: "移動",
										closeText: "閉じる",
									},
								},
							},
						},
						es: {
							translations: {
								button: {
									buttonText: "Buscar en la documentación",
									buttonAriaLabel: "Buscar en la documentación",
								},
								modal: {
									noResultsText: "No se encontraron resultados",
									resetButtonTitle: "Limpiar búsqueda",
									footer: {
										selectText: "Seleccionar",
										navigateText: "Navegar",
										closeText: "Cerrar",
									},
								},
							},
						},
					},
				},
			},

			socialLinks: [
				{
					icon: "github",
					link: site.repo,
					ariaLabel: "MemoFS on GitHub",
				},
				{
					icon: "x",
					link: site.x,
					ariaLabel: "MemoFS on X",
				},
				{
					icon: "youtube",
					link: site.youtube,
					ariaLabel: "MemoFS on YouTube",
				},
			],
		},

		mermaid: {
			startOnLoad: true,
			theme: "base",
			themeVariables: {
				darkMode: true,
			},
		},

		mermaidPlugin: {
			class: "mermaid",
		},
	}),
);
