import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "react-router";
import { Footer } from "~/components/footer";
import { baseOptions } from "~/lib/layout.shared";
import type { Route } from "./+types/changelog";

export const meta: Route.MetaFunction = () => {
	const pageTitle = "Changelog & Release Notes — MemoFS";
	const description =
		"All notable changes, new features, bug fixes, and releases across MemoFS packages (@memofs/core, @memofs/cli, @memofs/server, @memofs/mcp-server, adapters).";
	const canonicalUrl = "https://docs.memofs.dev/changelog";
	const ogImageUrl = "https://docs.memofs.dev/og-default.png";

	return [
		{ title: pageTitle },
		{ name: "description", content: description },
		{ property: "og:title", content: pageTitle },
		{ property: "og:description", content: description },
		{ property: "og:url", content: canonicalUrl },
		{ property: "og:image", content: ogImageUrl },
		{ property: "og:site_name", content: "MemoFS" },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:site", content: "@memofsdev" },
		{ name: "twitter:title", content: pageTitle },
		{ name: "twitter:description", content: description },
		{ name: "twitter:image", content: ogImageUrl },
		{ tagName: "link", rel: "canonical", href: canonicalUrl },
	];
};

interface ChangeItem {
	type: "Added" | "Changed" | "Fixed" | "Removed";
	text: string;
}

interface PackageSection {
	pkg: string;
	changes: ChangeItem[];
}

interface Release {
	version: string;
	date: string;
	summary: string;
	isLatest?: boolean;
	packages: PackageSection[];
}

const RELEASES: Release[] = [
	{
		version: "v1.3.0-beta.3",
		date: "August 17, 2026",
		summary:
			"Official Model Context Protocol Registry metadata, package ownership verification, and multi-transport support.",
		isLatest: true,
		packages: [
			{
				pkg: "MCP Server",
				changes: [
					{
						type: "Added",
						text: "Added official Model Context Protocol Registry manifest metadata for automated ecosystem discovery and subregistry indexing.",
					},
					{
						type: "Added",
						text: "Added package ownership verification property to MCP server package configuration.",
					},
					{
						type: "Added",
						text: "Added multi-transport support documenting local stdio runtime configuration and hosted streamable HTTP endpoints.",
					},
				],
			},
		],
	},
	{
		version: "v1.3.0-beta.2",
		date: "August 16, 2026",
		summary:
			"Typed note identifiers, write idempotency deduplication, and multi-dimensional status modeling.",
		packages: [
			{
				pkg: "Core Runtime",
				changes: [
					{
						type: "Added",
						text: "Added typed identifier support to note and conversation document interfaces.",
					},
					{
						type: "Added",
						text: "Added frontmatter and metadata normalization and serialization support for note identifiers.",
					},
					{
						type: "Added",
						text: "Added write idempotency deduplication to memory write inputs, preventing duplicate appends during write retries.",
					},
					{
						type: "Added",
						text: "Added orthogonal status dimensions (disputed, stale, unverified) to graph nodes and edges.",
					},
					{
						type: "Fixed",
						text: "Updated graph conflict detection to flag disputed edges alongside legacy conflict status.",
					},
				],
			},
		],
	},
	{
		version: "v1.3.0-beta.1",
		date: "August 13, 2026",
		summary:
			"Anchor drift detection, memory decay floors, semantic GC archive/restore, and session outcomes.",
		packages: [
			{
				pkg: "Core Runtime",
				changes: [
					{
						type: "Added",
						text: "Added anchor reference support with file paths, SHA-256 hashes, and symbols to memory write inputs.",
					},
					{
						type: "Added",
						text: "Added write-time symbol path extraction for TypeScript files using the TypeScript Compiler API.",
					},
					{
						type: "Added",
						text: "Added query-time drift detection inside memory recall and context building with automated score demotion for modified files.",
					},
					{
						type: "Added",
						text: "Added kind-specific decay floors for all 7 memory kinds (from 30 days for notes to 365 days for decisions).",
					},
					{
						type: "Added",
						text: "Added session outcome matrices (success, failure, aborted) governing durable memory promotion and ephemeral cleanup.",
					},
				],
			},
			{
				pkg: "CLI",
				changes: [
					{
						type: "Added",
						text: "Added CLI command to backfill anchor metadata onto existing structured notes.",
					},
					{
						type: "Added",
						text: "Added memory archive and restore commands for cold storage lifecycle management.",
					},
					{
						type: "Added",
						text: "Added automated memory consolidation fix option to the doctor diagnostics command.",
					},
				],
			},
			{
				pkg: "MCP Server",
				changes: [
					{
						type: "Added",
						text: "Added anchor parameters to memory write tool definitions and stale indicators to recall output.",
					},
				],
			},
		],
	},
	{
		version: "v1.2.0-beta.3",
		date: "August 6, 2026",
		summary:
			"Vercel AI SDK adapter schema refactoring, CLI UI/UX progress indicators, and terminal signal handling.",
		packages: [
			{
				pkg: "Adapters",
				changes: [
					{
						type: "Fixed",
						text: "Refactored Vercel AI SDK tool input schema to a root object format, fixing tool-calling compatibility with OpenAI, Anthropic, and Google Gemini models.",
					},
					{
						type: "Added",
						text: "Exposed both parameters and inputSchema fields on memory tool definitions for multi-version AI SDK support.",
					},
				],
			},
			{
				pkg: "CLI",
				changes: [
					{
						type: "Added",
						text: "Added zero-dependency TTY step spinners and itemized progress bars for long-running cloud sync operations.",
					},
					{
						type: "Added",
						text: "Added SIGINT and SIGTERM handlers to gracefully restore cursor visibility and handle cancellation.",
					},
				],
			},
		],
	},
	{
		version: "v1.2.0-beta.2",
		date: "July 26, 2026",
		summary:
			"Project manifest fallback, global CLI flag polish, and cloud sync snapshot fixes.",
		packages: [
			{
				pkg: "Core Runtime",
				changes: [
					{
						type: "Fixed",
						text: "Improved project ID resolution so local workspace operations automatically fall back to the project manifest.",
					},
				],
			},
			{
				pkg: "CLI",
				changes: [
					{
						type: "Added",
						text: "Added short flag support for global project ID selection across all cloud and sync subcommands.",
					},
					{
						type: "Fixed",
						text: "Fixed cloud sync pull to guarantee pre-sync snapshots prior to overwriting local workspace files.",
					},
				],
			},
		],
	},
	{
		version: "v1.2.0-beta.1",
		date: "July 25, 2026",
		summary:
			"MemoFS Cloud public release, core recall hardening, and connector enhancements.",
		packages: [
			{
				pkg: "Cloud",
				changes: [
					{
						type: "Added",
						text: "MemoFS Cloud (https://memofs.dev) is officially live with two-phase async replication.",
					},
				],
			},
			{
				pkg: "Core Runtime",
				changes: [
					{
						type: "Added",
						text: "Added hybrid replication client with conflict-free multi-agent sync.",
					},
				],
			},
		],
	},
	{
		version: "v1.1.0",
		date: "July 10, 2026",
		summary:
			"Cloudflare Workers & R2 storage adapter, Turso libSQL backend, and progressive context budgeting.",
		packages: [
			{
				pkg: "Adapters",
				changes: [
					{
						type: "Added",
						text: "Released @memofs/adapter-r2 for serverless Cloudflare R2 bucket storage.",
					},
					{
						type: "Added",
						text: "Released @memofs/adapter-turso for edge SQLite memory indexing via libSQL.",
					},
					{
						type: "Added",
						text: "Released @memofs/adapter-workers-ai for Cloudflare Workers AI embedding models.",
					},
				],
			},
		],
	},
	{
		version: "v1.0.0",
		date: "June 28, 2026",
		summary:
			"Initial stable release of MemoFS — the file-first memory runtime for AI agents.",
		packages: [
			{
				pkg: "Core Runtime & MCP",
				changes: [
					{
						type: "Added",
						text: "Initial release of @memofs/core with deterministic BM25 lexical recall, knowledge graph, and notes.md persistence.",
					},
					{
						type: "Added",
						text: "Initial release of @memofs/mcp-server with stdio MCP protocol tools (memofs.context, memofs.recall, memofs.remember).",
					},
					{
						type: "Added",
						text: "Initial release of @memofs/cli with interactive init, doctor diagnostics, and snapshot management.",
					},
				],
			},
		],
	},
];

function TagBadge({ type }: { type: ChangeItem["type"] }) {
	const styles = {
		Added:
			"bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60",
		Changed:
			"bg-sky-500/10 text-sky-700 border-sky-500/20 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60",
		Fixed:
			"bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
		Removed:
			"bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
	};

	return (
		<span
			className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider leading-none shrink-0 ${styles[type]}`}
		>
			{type}
		</span>
	);
}

export default function ChangelogPage() {
	return (
		<HomeLayout {...baseOptions()}>
			<div className="relative w-full bg-white text-zinc-900 dark:bg-black dark:text-white transition-colors duration-300">
				{/* Header */}
				<div className="border-b border-dashed border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 py-16 sm:py-20">
					<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
						<div className="max-w-3xl">
							<span className="inline-flex items-center rounded border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
								Release History
							</span>
							<h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
								MemoFS Changelog
							</h1>
							<p className="mt-4 text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
								All notable changes, architectural milestones, bug fixes, and
								feature additions across all MemoFS workspace packages.
							</p>

							{/* Package Changelog Badges */}
							<div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
								<span className="text-zinc-500">Per-package repos:</span>
								<a
									href="https://github.com/memo-fs/memofs/blob/main/packages/core/CHANGELOG.md"
									target="_blank"
									rel="noreferrer"
									className="rounded border border-dashed border-zinc-300 bg-white px-2 py-1 font-mono text-[11px] text-zinc-700 hover:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 transition-colors"
								>
									@memofs/core
								</a>
								<a
									href="https://github.com/memo-fs/memofs/blob/main/packages/cli/CHANGELOG.md"
									target="_blank"
									rel="noreferrer"
									className="rounded border border-dashed border-zinc-300 bg-white px-2 py-1 font-mono text-[11px] text-zinc-700 hover:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 transition-colors"
								>
									@memofs/cli
								</a>
								<a
									href="https://github.com/memo-fs/memofs/blob/main/packages/mcp-server/CHANGELOG.md"
									target="_blank"
									rel="noreferrer"
									className="rounded border border-dashed border-zinc-300 bg-white px-2 py-1 font-mono text-[11px] text-zinc-700 hover:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 transition-colors"
								>
									@memofs/mcp-server
								</a>
								<a
									href="https://github.com/memo-fs/memofs/releases"
									target="_blank"
									rel="noreferrer"
									className="rounded border border-dashed border-zinc-300 bg-white px-2 py-1 font-mono text-[11px] text-zinc-700 hover:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 transition-colors"
								>
									GitHub Releases ↗
								</a>
							</div>
						</div>
					</div>
				</div>

				{/* Main Timeline Section */}
				<div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
					<div className="relative border-l border-dashed border-zinc-300 dark:border-zinc-800 pl-6 sm:pl-10 space-y-16">
						{RELEASES.map((release) => (
							<div key={release.version} className="relative group">
								{/* Node marker on the timeline rail */}
								<div className="absolute -left-7.75 sm:-left-11.75 top-1.5 size-4 rounded-full border-2 border-zinc-900 bg-white dark:border-white dark:bg-black group-hover:scale-125 transition-transform" />

								{/* Release Header */}
								<div className="flex flex-wrap items-center gap-3">
									<h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
										{release.version}
									</h2>
									<span className="rounded-full border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-0.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
										{release.date}
									</span>
									{release.isLatest && (
										<span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
											Latest Release
										</span>
									)}
								</div>

								{/* Summary */}
								<p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
									{release.summary}
								</p>

								{/* Release Packages & Changes List */}
								<div className="mt-6 space-y-6">
									{release.packages.map((pkgSec) => (
										<div
											key={pkgSec.pkg}
											className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 p-5"
										>
											<h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
												{pkgSec.pkg}
											</h3>
											<ul className="mt-3 space-y-3">
												{pkgSec.changes.map((change) => (
													<li
														key={change.text}
														className="flex items-start gap-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300"
													>
														<div className="mt-0.5 shrink-0">
															<TagBadge type={change.type} />
														</div>
														<span className="flex-1">{change.text}</span>
													</li>
												))}
											</ul>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Bottom CTA Block */}
				<div className="border-t border-dashed border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 py-16">
					<div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
						<h2 className="text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">
							Stay up to date with MemoFS
						</h2>
						<p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
							Follow releases directly on GitHub or check out our developer
							cookbooks.
						</p>
						<div className="mt-6 flex items-center justify-center gap-3">
							<Link
								to="/cookbooks"
								className="inline-flex h-9 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 px-4 text-xs font-medium transition-colors"
							>
								View Cookbooks →
							</Link>
							<a
								href="https://github.com/memo-fs/memofs/releases"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex h-9 items-center justify-center rounded border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 px-4 text-xs font-medium transition-colors"
							>
								Watch on GitHub
							</a>
						</div>
					</div>
				</div>

				{/* Footer */}
				<Footer />
			</div>
		</HomeLayout>
	);
}
