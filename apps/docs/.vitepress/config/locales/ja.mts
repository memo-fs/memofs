import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";
import { site } from "../site.mts";
import { getVersionNav } from "../versions.mts";

export const navJa: DefaultTheme.NavItem[] = [
	{
		text: "スタートガイド",
		link: "/ja/introduction",
		activeMatch: "^/ja/introduction",
	},
	{
		text: "API リファレンス",
		link: "/api/",
		activeMatch: "^/api/",
	},
	{
		text: "学習",
		items: [
			{ text: "クックブック (Cookbooks)", link: "/learn/cookbooks/" },
			{ text: "学習トラック (Tracks)", link: "/learn/tracks/" },
		],
		activeMatch: "^/learn/",
	},
	{
		text: "コミュニティ",
		items: [
			{ text: "ロードマップ", link: "/community/roadmap" },
			{ text: "コントリビューション", link: "/community/contributing" },
			{
				text: "GitHub ディスカッション",
				link: "https://github.com/memo-fs/memofs/discussions",
			},
			{
				text: "Good First Issues",
				link: "https://github.com/memo-fs/memofs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22",
			},
		],
		activeMatch: "^/community/",
	},
	{
		text: "クラウド",
		link: "https://memofs.dev",
	},
	getVersionNav(),
];

export const sidebarJa: DefaultTheme.Sidebar = {
	"/ja/": [
		{
			text: "コアランタイム & SDK",
			collapsed: false,
			items: [
				{ text: "スタートガイド", link: "/ja/introduction" },
				{ text: "概要", link: "/ja/core/" },
				{ text: "コアコンセプト", link: "/ja/core/concepts" },
				{ text: "設定", link: "/core/configuration" },
				{ text: "メモリ", link: "/core/memory" },
				{ text: "想起とコンテキスト", link: "/core/recall" },
				{ text: "ナレッジグラフ", link: "/core/graph" },
				{ text: "スナップショット", link: "/core/snapshots" },
				{ text: "AgentFS", link: "/core/agentfs" },
				{ text: "クラウド同期", link: "/core/sync" },
				{ text: "ユーティリティ", link: "/core/utilities" },
				{ text: "リファレンス", link: "/core/reference" },
			],
		},
		{
			text: "セルフホスティング",
			collapsed: false,
			items: [
				{ text: "概要", link: "/server/" },
				{ text: "Node.js", link: "/server/node" },
				{ text: "Cloudflare", link: "/server/cloudflare" },
				{ text: "HTTP API", link: "/server/http-api" },
				{ text: "ストレージの設定", link: "/server/storage" },
				{ text: "インテリジェンスの設定", link: "/server/intelligence" },
				{ text: "API リファレンス", link: "/server/api-reference" },
			],
		},
		{
			text: "アダプター",
			collapsed: false,
			items: [
				{ text: "概要", link: "/adapters/" },
				{ text: "OpenAI", link: "/adapters/openai" },
				{ text: "Voyage AI", link: "/adapters/voyage" },
				{ text: "Transformers.js", link: "/adapters/transformers" },
				{ text: "Workers AI", link: "/adapters/workers-ai" },
				{ text: "Cloudflare R2", link: "/adapters/r2" },
				{ text: "Turso / libSQL", link: "/adapters/turso" },
				{ text: "Vercel AI SDK", link: "/adapters/ai-sdk" },
			],
		},
		{
			text: "コマンドライン (CLI)",
			collapsed: false,
			items: [
				{ text: "概要", link: "/cli/" },
				{ text: "メモリコマンド", link: "/cli/memory" },
				{ text: "Agent コマンド", link: "/cli/agent" },
				{ text: "生成コマンド", link: "/cli/generate" },
				{ text: "コネクタコマンド", link: "/cli/connectors" },
				{ text: "クラウドコマンド", link: "/cli/cloud" },
				{ text: "設定コマンド", link: "/cli/config" },
			],
		},
		{
			text: "モデルコンテキストプロトコル (MCP)",
			collapsed: false,
			items: [
				{ text: "ローカルモード", link: "/mcp/" },
				{ text: "ハイブリッドモード", link: "/mcp/hybrid-mode" },
				{
					text: "ホスト型 MCP エンドポイント",
					link: "/mcp/hosted-mcp-endpoint",
				},
			],
		},
		{
			text: "コネクタ",
			collapsed: false,
			items: [
				{ text: "フレームワーク", link: "/connectors/" },
				{
					text: "組み込みコネクタ",
					link: "/connectors/built-in-connectors",
				},
				{
					text: "カスタムコネクタ",
					link: "/connectors/custom-connectors",
				},
			],
		},
		{
			text: "開発者ツール",
			collapsed: false,
			items: [
				{ text: "JSON-RPC プリミティブ", link: "/tooling/json-rpc" },
				{ text: "テストフレームワーク", link: "/tooling/testing" },
				{ text: "ベンチマークキット", link: "/tooling/benchmark-kit" },
			],
		},
	],
};

export const jaLocale: LocaleSpecificConfig = {
	title: site.title,
	description:
		"AI エージェント向けファイルファーストのメモリランタイム。決定事項を Markdown としてリポジトリに保存します。",
	themeConfig: {
		nav: navJa,
		sidebar: sidebarJa,
		outline: {
			level: [2, 3],
			label: "このページの内容",
		},
		docFooter: {
			prev: "前のページ",
			next: "次のページ",
		},
		lastUpdated: {
			text: "最終更新",
			formatOptions: {
				dateStyle: "medium",
				timeStyle: "short",
			},
		},
		editLink: {
			pattern: `${site.repo}/edit/main/apps/docs/:path`,
			text: "GitHub でこのページを編集",
		},
		footer: {
			message: `${site.license} ライセンスに基づいて公開されています。`,
			copyright: "Copyright © 2026-present MemoFS",
		},
	},
};
