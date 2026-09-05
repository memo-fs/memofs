/**
 * Marketing route for the canonical MDX changelog. The release history itself
 * lives in content/docs/changelog.mdx so it is shared with the docs route and
 * LLM exports without a second hand-maintained dataset.
 */

import { DocsBody } from "fumadocs-ui/layouts/docs/page";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import type React from "react";
import { Badge } from "~/components/ui/badge";
import { Footer } from "../components/footer";
import { useMDXComponents } from "../components/mdx";
import { baseOptions } from "../lib/layout.shared";
import { createPageMeta } from "../lib/meta";
import { createRelativeLink } from "../lib/relative-link";
import { ROUTES, SITE } from "../lib/site";
import { docs } from "../lib/source";
import { cn } from "../lib/utils";
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
		"bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
	Changed:
		"bg-sky-500/10 text-sky-700 border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/60",
	Fixed:
		"bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
	Removed:
		"bg-rose-500/10 text-rose-700 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60",
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
		<div className="not-prose relative mt-10 first:mt-0 pt-1">
			{/* Timeline node marker - placed at exact pixel height aligned with h2 text line */}
			<span
				className="absolute left-[-30.5px] sm:left-[-46.5px] top-1.75 size-3 rounded-full border-2 border-primary bg-background dark:border-primary dark:bg-background ring-4 ring-background"
				aria-hidden="true"
			/>
			<div className="flex flex-wrap items-center gap-2 sm:gap-2.5 leading-none">
				<h2
					id={id}
					className="text-lg sm:text-xl font-bold tracking-tight text-foreground m-0 p-0 leading-none scroll-mt-24"
					{...props}
				>
					{version}
				</h2>
				{date && (
					<Badge variant="secondary" className="font-mono text-[11px]">
						{date}
					</Badge>
				)}
				{isLatest && (
					<Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400 font-mono text-[10px] uppercase tracking-wider">
						Latest
					</Badge>
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
			className="mt-4 mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-foreground scroll-mt-24"
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
			<div className="not-prose mt-2.5 mb-1 flex items-center">
				<Badge
					className={cn(
						"font-mono text-[10px] uppercase tracking-wider",
						badgeStyle,
					)}
				>
					{rawText}
				</Badge>
			</div>
		);
	}

	return (
		<h4
			id={id}
			className="mt-2.5 mb-1 text-xs font-semibold text-foreground scroll-mt-24"
			{...props}
		>
			{children}
		</h4>
	);
}

/** Custom list container for changelog entries. */
function ChangelogUl({
	children,
	...props
}: React.ComponentPropsWithoutRef<"ul">) {
	return (
		<ul className="not-prose mt-1 mb-4 space-y-1 list-none pl-0" {...props}>
			{children}
		</ul>
	);
}

/** Custom list item styling. */
function ChangelogLi({
	children,
	...props
}: React.ComponentPropsWithoutRef<"li">) {
	return (
		<li
			className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed text-foreground"
			{...props}
		>
			<span
				className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground"
				aria-hidden="true"
			/>
			<span className="flex-1 min-w-0">{children}</span>
		</li>
	);
}

/** Custom paragraph styling. */
function ChangelogP({
	children,
	...props
}: React.ComponentPropsWithoutRef<"p">) {
	return (
		<p
			className="mt-2 mb-3 text-xs sm:text-sm leading-normal text-muted-foreground"
			{...props}
		>
			{children}
		</p>
	);
}

/** Custom horizontal divider. */
function ChangelogHr(props: React.ComponentPropsWithoutRef<"hr">) {
	return (
		<hr className="my-6 border-t border-dashed border-border" {...props} />
	);
}

/** Renders the changelog MDX content with the marketing-site shell. */
export default function ChangelogPage() {
	const page = docs.getPage("changelog.mdx");
	if (!page) throw new Error("The canonical changelog document is missing.");
	const Mdx = page.body;

	return (
		<HomeLayout {...baseOptions()}>
			<div className="relative w-full bg-background text-foreground">
				<header className="border-b border-dashed border-border bg-muted/50 py-10 dark:border-border/80 dark:bg-muted/40 sm:py-14">
					<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
						<Badge
							variant="secondary"
							className="border-dashed font-mono text-[11px]"
						>
							Release History
						</Badge>
						<h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
							Changelog
						</h1>
						<p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
							All notable changes, architectural milestones, bug fixes, and
							feature additions across all {SITE.name} workspace packages.
						</p>
					</div>
				</header>

				<main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
					<div className="relative border-l border-dashed border-border pl-6 sm:pl-10">
						<DocsBody className="max-w-none">
							<Mdx
								components={useMDXComponents({
									a: createRelativeLink({ url: ROUTES.changelog }),
									h2: ChangelogH2,
									h3: ChangelogH3,
									h4: ChangelogH4,
									ul: ChangelogUl,
									li: ChangelogLi,
									p: ChangelogP,
									hr: ChangelogHr,
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
