import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";
import { site } from "../site.mts";
import { getVersionNav } from "../versions.mts";

export const navZh: DefaultTheme.NavItem[] = [
	{
		text: "快速开始",
		link: "/zh/introduction",
		activeMatch: "^/zh/introduction",
	},
	{
		text: "API 参考",
		link: "/api/",
		activeMatch: "^/api/",
	},
	{
		text: "学习",
		items: [
			{ text: "实战菜谱 (Cookbooks)", link: "/learn/cookbooks/" },
			{ text: "学习路径 (Tracks)", link: "/learn/tracks/" },
		],
		activeMatch: "^/learn/",
	},
	{
		text: "社区",
		items: [
			{ text: "路线图", link: "/community/roadmap" },
			{ text: "贡献指南", link: "/community/contributing" },
			{
				text: "GitHub 讨论区",
				link: "https://github.com/memo-fs/memofs/discussions",
			},
			{
				text: "适合新手的问题 (Good First Issues)",
				link: "https://github.com/memo-fs/memofs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22",
			},
		],
		activeMatch: "^/community/",
	},
	{
		text: "云端服务",
		link: "https://memofs.dev",
	},
	getVersionNav(),
];

export const sidebarZh: DefaultTheme.Sidebar = {
	"/zh/": [
		{
			text: "核心运行时与 SDK",
			collapsed: false,
			items: [
				{ text: "快速开始", link: "/zh/introduction" },
				{ text: "概述", link: "/zh/core/" },
				{ text: "核心概念", link: "/zh/core/concepts" },
				{ text: "配置", link: "/core/configuration" },
				{ text: "记忆存储", link: "/core/memory" },
				{ text: "召回与上下文", link: "/core/recall" },
				{ text: "知识图谱", link: "/core/graph" },
				{ text: "快照", link: "/core/snapshots" },
				{ text: "AgentFS", link: "/core/agentfs" },
				{ text: "云端同步", link: "/core/sync" },
				{ text: "实用工具", link: "/core/utilities" },
				{ text: "参考文档", link: "/core/reference" },
			],
		},
		{
			text: "自托管",
			collapsed: false,
			items: [
				{ text: "概述", link: "/server/" },
				{ text: "Node.js", link: "/server/node" },
				{ text: "Cloudflare", link: "/server/cloudflare" },
				{ text: "HTTP API", link: "/server/http-api" },
				{ text: "配置存储", link: "/server/storage" },
				{ text: "配置模型智能", link: "/server/intelligence" },
				{ text: "API 参考", link: "/server/api-reference" },
			],
		},
		{
			text: "适配器",
			collapsed: false,
			items: [
				{ text: "概述", link: "/adapters/" },
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
			text: "命令行 (CLI)",
			collapsed: false,
			items: [
				{ text: "概述", link: "/cli/" },
				{ text: "记忆命令", link: "/cli/memory" },
				{ text: "Agent 命令", link: "/cli/agent" },
				{ text: "生成命令", link: "/cli/generate" },
				{ text: "连接器命令", link: "/cli/connectors" },
				{ text: "云端命令", link: "/cli/cloud" },
				{ text: "配置命令", link: "/cli/config" },
			],
		},
		{
			text: "模型上下文协议 (MCP)",
			collapsed: false,
			items: [
				{ text: "本地模式", link: "/mcp/" },
				{ text: "混合模式", link: "/mcp/hybrid-mode" },
				{
					text: "托管 MCP 端点",
					link: "/mcp/hosted-mcp-endpoint",
				},
			],
		},
		{
			text: "连接器",
			collapsed: false,
			items: [
				{ text: "框架", link: "/connectors/" },
				{
					text: "内置连接器",
					link: "/connectors/built-in-connectors",
				},
				{
					text: "自定义连接器",
					link: "/connectors/custom-connectors",
				},
			],
		},
		{
			text: "开发者工具",
			collapsed: false,
			items: [
				{ text: "JSON-RPC 原语", link: "/tooling/json-rpc" },
				{ text: "测试框架", link: "/tooling/testing" },
				{ text: "基准测试套件", link: "/tooling/benchmark-kit" },
			],
		},
	],
};

export const zhLocale: LocaleSpecificConfig = {
	title: site.title,
	description:
		"AI 智能体的文件优先记忆运行时。将决策作为 Markdown 保存在代码仓库中。",
	themeConfig: {
		nav: navZh,
		sidebar: sidebarZh,
		outline: {
			level: [2, 3],
			label: "本页目录",
		},
		docFooter: {
			prev: "上一页",
			next: "下一页",
		},
		lastUpdated: {
			text: "更新于",
			formatOptions: {
				dateStyle: "medium",
				timeStyle: "short",
			},
		},
		editLink: {
			pattern: `${site.repo}/edit/main/apps/docs/:path`,
			text: "在 GitHub 上编辑此页",
		},
		footer: {
			message: `基于 ${site.license} 协议开源发布。`,
			copyright: "Copyright © 2026-present MemoFS",
		},
	},
};
