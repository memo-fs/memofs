import type { DefaultTheme, LocaleSpecificConfig } from "vitepress";
import { site } from "../site.mts";
import { getVersionNav } from "../versions.mts";

export const navEs: DefaultTheme.NavItem[] = [
	{
		text: "Primeros Pasos",
		link: "/es/introduction",
		activeMatch: "^/es/introduction",
	},
	{
		text: "Referencia API",
		link: "/api/",
		activeMatch: "^/api/",
	},
	{
		text: "Aprender",
		items: [
			{ text: "Recetarios (Cookbooks)", link: "/learn/cookbooks/" },
			{ text: "Rutas de Aprendizaje (Tracks)", link: "/learn/tracks/" },
		],
		activeMatch: "^/learn/",
	},
	{
		text: "Comunidad",
		items: [
			{ text: "Hoja de Ruta (Roadmap)", link: "/community/roadmap" },
			{ text: "Contribuir", link: "/community/contributing" },
			{
				text: "Discusiones en GitHub",
				link: "https://github.com/memo-fs/memofs/discussions",
			},
			{
				text: "Buenas Primeras Tareas (Good First Issues)",
				link: "https://github.com/memo-fs/memofs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22",
			},
		],
		activeMatch: "^/community/",
	},
	{
		text: "Nube (Cloud)",
		link: "https://memofs.dev",
	},
	getVersionNav(),
];

export const sidebarEs: DefaultTheme.Sidebar = {
	"/es/": [
		{
			text: "Motor Principal y SDK",
			collapsed: false,
			items: [
				{ text: "Primeros Pasos", link: "/es/introduction" },
				{ text: "Visión General", link: "/es/core/" },
				{ text: "Conceptos Fundamentales", link: "/es/core/concepts" },
				{ text: "Configuración", link: "/core/configuration" },
				{ text: "Memoria", link: "/core/memory" },
				{ text: "Recuperación y Contexto", link: "/core/recall" },
				{ text: "Grafo de Conocimiento", link: "/core/graph" },
				{ text: "Instantáneas (Snapshots)", link: "/core/snapshots" },
				{ text: "AgentFS", link: "/core/agentfs" },
				{ text: "Sincronización en la Nube", link: "/core/sync" },
				{ text: "Utilidades", link: "/core/utilities" },
				{ text: "Referencia", link: "/core/reference" },
			],
		},
		{
			text: "Autoalojamiento (Self-Hosting)",
			collapsed: false,
			items: [
				{ text: "Visión General", link: "/server/" },
				{ text: "Node.js", link: "/server/node" },
				{ text: "Cloudflare", link: "/server/cloudflare" },
				{ text: "API HTTP", link: "/server/http-api" },
				{ text: "Configurar Almacenamiento", link: "/server/storage" },
				{ text: "Configurar Inteligencia", link: "/server/intelligence" },
				{ text: "Referencia de API", link: "/server/api-reference" },
			],
		},
		{
			text: "Adaptadores",
			collapsed: false,
			items: [
				{ text: "Visión General", link: "/adapters/" },
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
			text: "Línea de Comandos (CLI)",
			collapsed: false,
			items: [
				{ text: "Visión General", link: "/cli/" },
				{ text: "Comandos de Memoria", link: "/cli/memory" },
				{ text: "Comandos de Agentes", link: "/cli/agent" },
				{ text: "Comandos de Generación", link: "/cli/generate" },
				{ text: "Comandos de Conectores", link: "/cli/connectors" },
				{ text: "Comandos de la Nube", link: "/cli/cloud" },
				{ text: "Comandos de Configuración", link: "/cli/config" },
			],
		},
		{
			text: "Protocolo de Contexto de Modelo (MCP)",
			collapsed: false,
			items: [
				{ text: "Modo Local", link: "/mcp/" },
				{ text: "Modo Híbrido", link: "/mcp/hybrid-mode" },
				{
					text: "Punto Final MCP Alojado",
					link: "/mcp/hosted-mcp-endpoint",
				},
			],
		},
		{
			text: "Conectores",
			collapsed: false,
			items: [
				{ text: "Estructura", link: "/connectors/" },
				{
					text: "Conectores Integrados",
					link: "/connectors/built-in-connectors",
				},
				{
					text: "Conectores Personalizados",
					link: "/connectors/custom-connectors",
				},
			],
		},
		{
			text: "Herramientas para Desarrolladores",
			collapsed: false,
			items: [
				{ text: "Primitivas JSON-RPC", link: "/tooling/json-rpc" },
				{ text: "Marco de Pruebas", link: "/tooling/testing" },
				{
					text: "Kit de Rendimiento (Benchmark)",
					link: "/tooling/benchmark-kit",
				},
			],
		},
	],
};

export const esLocale: LocaleSpecificConfig = {
	title: site.title,
	description:
		"Entorno de ejecución de memoria basado en archivos para agentes de IA. Guarda decisiones en Markdown dentro de tu repositorio.",
	themeConfig: {
		nav: navEs,
		sidebar: sidebarEs,
		outline: {
			level: [2, 3],
			label: "En esta página",
		},
		docFooter: {
			prev: "Anterior",
			next: "Siguiente",
		},
		lastUpdated: {
			text: "Actualizado el",
			formatOptions: {
				dateStyle: "medium",
				timeStyle: "short",
			},
		},
		editLink: {
			pattern: `${site.repo}/edit/main/apps/docs/:path`,
			text: "Editar esta página en GitHub",
		},
		footer: {
			message: `Publicado bajo la Licencia ${site.license}.`,
			copyright: "Copyright © 2026-presente MemoFS",
		},
	},
};
