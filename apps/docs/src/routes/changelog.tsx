/**
 * Marketing route for the canonical MDX changelog. The release history itself
 * lives in content/docs/changelog.mdx so it is shared with the docs route and
 * LLM exports without a second hand-maintained dataset.
 */

import { DocsBody } from "fumadocs-ui/layouts/docs/page";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import type React from "react";
import { Footer } from "../components/footer";
import { useMDXComponents } from "../components/mdx";
import { baseOptions } from "../lib/layout.shared";
import { createPageMeta } from "../lib/meta";
import { createRelativeLink } from "../lib/relative-link";
import { ROUTES, SITE } from "../lib/site";
import { docs, source } from "../lib/source";
import type { Route } from "./+types/changelog";

/** Metadata for the public changelog route. */
export const meta: Route.MetaFunction = () =>
	createPageMeta({
		title: "Changelog & Release Notes — MemoFS",
		description:
			"All notable changes, new features, bug fixes, and releases across MemoFS packages (@memofs/core, @memofs/cli, @memofs/server, @memofs/mcp-server, adapters).",
		path: ROUTES.changelog,
	});

/** Extracts plain string content recursively from React children. */
function getTextContent(node: React.ReactNode): string {
	if (typeof node === "string" || typeof node === "number") {
		return String(node);
	}
	if (Array.isArray(node)) {
		return node.map(getTextContent).join("");
	}
	if (node && typeof node === "object" && "props" in node) {
		return getTextContent(
			(node as { props: { children?: React.ReactNode } }).props.children,
		);
	}
	return "";
}

/** Badge style mapping for change types across light and dark modes. */
const TAG_BADGES: Record<string, string> = {
	Added:
		"bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
	Changed:
		"bg-sky-500/10 text-sky-700 border-sky-500/25 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
	Fixed:
		"bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
	Removed:
		"bg-rose-500/10 text-rose-700 border-rose-500/25 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60",
};

/** Custom heading component for release headers (H2). */
function ChangelogH2({
	children,
	id,
	...props
}: React.ComponentPropsWithoutRef<"h2">) {
	const rawText = getTextContent(children).trim();

	// Match "v1.3.0-beta.3 — August 17, 2026" or "Unreleased"
	const separator = rawText.includes("—")
		? "—"
		: rawText.includes("–")
			? "–"
			: rawText.includes(" - ")
				? " - "
				: null;

	let version = rawText;
	let date: string | null = null;

	if (separator) {
		const parts = rawText.split(separator);
		version = (parts[0] ?? "").trim();
		date = (parts[1] ?? "").trim();
	}

	const isLatest = version === "v1.3.0-beta.3";

	return (
		<div className="relative group pt-10 first:pt-2">
			{/* Timeline node marker */}
			<div
				className="absolute -left-[31px] sm:-left-[47px] top-12.5 first:top-4.5 size-4 rounded-full border-2 border-zinc-900 bg-white dark:border-white dark:bg-black group-hover:scale-125 transition-transform"
				aria-hidden="true"
			/>
			<div className="flex flex-wrap items-center gap-3">
				<h2
					id={id}
					className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white m-0 scroll-mt-24"
					{...props}
				>
					{version}
				</h2>
				{date && (
					<span className="rounded-full border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-0.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
						{date}
					</span>
				)}
				{isLatest && (
					<span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
						Latest Release
					</span>
				)}
			</div>
		</div>
	);
}

/** Custom heading component for package scope (H3). */
function ChangelogH3({
	children,
	id,
	...props
}: React.ComponentPropsWithoutRef<"h3">) {
	return (
		<h3
			id={id}
			className="mt-6 mb-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200 border-b border-dashed border-zinc-200 dark:border-zinc-800/80 pb-1.5 scroll-mt-24"
			{...props}
		>
			{children}
		</h3>
	);
}

/** Custom heading component for change categories (H4). */
function ChangelogH4({
	children,
	id,
	...props
}: React.ComponentPropsWithoutRef<"h4">) {
	const rawText = getTextContent(children).trim();
	const badgeStyle = TAG_BADGES[rawText];

	if (badgeStyle) {
		return (
			<h4 id={id} className="mt-4 mb-2 flex items-center" {...props}>
				<span
					className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider leading-none shrink-0 ${badgeStyle}`}
				>
					{rawText}
				</span>
			</h4>
		);
	}

	return (
		<h4
			id={id}
			className="mt-4 mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 scroll-mt-24"
			{...props}
		>
			{children}
		</h4>
	);
}

/** Custom list item styling. */
function ChangelogLi({
	children,
	...props
}: React.ComponentPropsWithoutRef<"li">) {
	return (
		<li
			className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 my-1"
			{...props}
		>
			<span
				className="mt-1.5 size-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600"
				aria-hidden="true"
			/>
			<span className="flex-1">{children}</span>
		</li>
	);
}

/** Renders the changelog MDX content with the marketing-site shell. */
export default function ChangelogPage() {
	const page = docs.getPage("changelog.mdx");
	if (!page) throw new Error("The canonical changelog document is missing.");
	const Mdx = page.body;

	return (
		<HomeLayout {...baseOptions()}>
			<div className="relative w-full bg-white text-zinc-900 transition-colors duration-300 dark:bg-black dark:text-white">
				<header className="border-b border-dashed border-zinc-200 bg-zinc-50/50 py-16 dark:border-zinc-800/80 dark:bg-zinc-950/40 sm:py-20">
					<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
						<span className="inline-flex items-center rounded border border-dashed border-zinc-300 bg-zinc-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
							Release History
						</span>
						<h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
							Changelog
						</h1>
						<p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
							All notable changes, architectural milestones, bug fixes, and
							feature additions across all {SITE.name} workspace packages.
						</p>
					</div>
				</header>

				<main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
					<div className="relative border-l border-dashed border-zinc-300 dark:border-zinc-800 pl-6 sm:pl-10 space-y-4">
						<DocsBody className="max-w-none">
							<Mdx
								components={useMDXComponents({
									a: createRelativeLink(source, { url: ROUTES.changelog }),
									h2: ChangelogH2,
									h3: ChangelogH3,
									h4: ChangelogH4,
									li: ChangelogLi,
								})}
							/>
						</DocsBody>
					</div>
				</main>
				<Footer />
			</div>
		</HomeLayout>
	);
}
