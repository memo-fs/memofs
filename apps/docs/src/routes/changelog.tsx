/**
 * Marketing route for the canonical MDX changelog. The release history itself
 * lives in content/docs/changelog.mdx so it is shared with the docs route and
 * LLM exports without a second hand-maintained dataset.
 */

import { Callout } from "fumadocs-ui/components/callout";
import { DocsBody } from "fumadocs-ui/layouts/docs/page";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import type React from "react";
import { Badge } from "~/components/ui/badge";
import { Crosshair } from "../components/crosshair";
import { Footer } from "../components/footer";
import { getMDXComponents } from "../components/mdx";
import { baseOptions } from "../lib/layout.shared";
import { createPageMeta } from "../lib/meta";
import { createRelativeLink } from "../lib/relative-link";
import { ROUTES, releaseTagUrl, SITE } from "../lib/site";
import { docs } from "../lib/source";
import { cn } from "../lib/utils";
import type { Route } from "./+types/changelog";

/** Metadata for the public changelog route. */
export const meta: Route.MetaFunction = () =>
	createPageMeta({
		title: "Changelog & Release Notes",
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

	const isLatest = version === SITE.latestRelease;
	// Version trains (e.g. "v1.3.0-beta.3") deep-link to their tagged GitHub
	// release; "Unreleased" and other headings render as plain text.
	const releaseUrl = /^v\d/.test(version) ? releaseTagUrl(version) : null;

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
					{releaseUrl ? (
						<a
							href={releaseUrl}
							target="_blank"
							rel="noreferrer"
							className="transition-colors hover:text-amber-400"
						>
							{version}
						</a>
					) : (
						version
					)}
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

/** Custom paragraph styling. — hides the intro paragraph moved into the hero */
// Both strings below mirror copy in `content/docs/changelog.mdx`. If that
// source sentence is reworded, update the constant here — never re-type the
// literal at the use site.
const CHANGELOG_INTRO_SENTENCE =
	"All notable changes to MemoFS are documented here.";
const PER_PACKAGE_CALLOUT_TITLE = "Per-Package Changelogs";

function ChangelogP({
	children,
	...props
}: React.ComponentPropsWithoutRef<"p">) {
	const text = getTextContent(children).trim();
	if (text === CHANGELOG_INTRO_SENTENCE) {
		return null;
	}
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

/** Suppress the per-package Callout moved into the hero */
function ChangelogCallout(props: React.ComponentProps<typeof Callout>) {
	const { title, children, ...rest } = props;
	const titleText =
		typeof title === "string" ? title.trim() : getTextContent(title).trim();
	if (titleText === PER_PACKAGE_CALLOUT_TITLE) return null;
	return (
		<Callout title={title} {...rest}>
			{children}
		</Callout>
	);
}

/** Renders the changelog MDX content with the marketing-site shell. */
// Module scope: identical on every render (pure object spread, no hooks).
const changelogComponents = getMDXComponents({
	a: createRelativeLink({ url: ROUTES.changelog }),
	h2: ChangelogH2,
	h3: ChangelogH3,
	h4: ChangelogH4,
	ul: ChangelogUl,
	li: ChangelogLi,
	p: ChangelogP,
	hr: ChangelogHr,
	Callout: ChangelogCallout,
});

/** Renders the changelog MDX content with the marketing-site shell. */
export default function ChangelogPage() {
	const page = docs.getPage("changelog.mdx");
	if (!page) throw new Error("The canonical changelog document is missing.");
	const Mdx = page.body;

	return (
		<HomeLayout {...baseOptions()}>
			<div className="relative w-full bg-background text-foreground">
				{/* Changelog Hero — minimal landing hero with per-package panel */}
				<section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
					<div className="relative mx-auto w-full max-w-5xl">
						{/* Outer drafting guidelines */}
						<div className="pointer-events-none absolute -left-6 -right-6 top-0 origin-center animate-line-x border-t border-dashed border-border/70 sm:-left-10 sm:-right-10" />
						<div className="pointer-events-none absolute -left-6 -right-6 bottom-0 origin-center animate-line-x border-b border-dashed border-border/70 sm:-left-10 sm:-right-10" />
						<div className="pointer-events-none absolute -top-6 -bottom-6 left-0 origin-top animate-line-y border-l border-dashed border-border/70 sm:-top-8 sm:-bottom-8" />
						<div className="pointer-events-none absolute -top-6 -bottom-6 right-0 origin-top animate-line-y border-r border-dashed border-border/70 sm:-top-8 sm:-bottom-8" />

						<Crosshair className="-top-1.75 -left-1.75" />
						<Crosshair className="-top-1.75 -right-1.75" />
						<Crosshair className="-bottom-1.75 -left-1.75" />
						<Crosshair className="-bottom-1.75 -right-1.75" />

						{/* Top bar */}
						<div className="relative flex items-center justify-between border-x border-t border-dashed border-border px-4 py-2 font-mono text-xs text-muted-foreground backdrop-blur-xs sm:px-6">
							<span className="font-semibold text-foreground">
								~ <code>cat CHANGELOG.md</code>
							</span>
							<span className="hidden text-[10px] tracking-widest uppercase sm:inline">
								release / history
							</span>
						</div>

						{/* Main box */}
						<div className="relative border border-dashed border-border">
							{/* Headline */}
							<div className="relative px-4 py-8 text-center sm:px-8 sm:py-10">
								<div className="flex items-center justify-center gap-2">
									<span aria-hidden className="size-1.5 bg-amber-400" />
									<span className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-amber-400">
										Release History
									</span>
								</div>
								<h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-bold leading-[1.04] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-6xl">
									Changelog
								</h1>
							</div>

							{/* Mid divider with crosshairs */}
							<div className="relative border-t border-dashed border-border">
								<div className="pointer-events-none absolute inset-x-0 top-0 origin-left animate-line-x border-t border-dashed border-border" />
								<Crosshair className="-top-1.75 -left-1.75" />
								<Crosshair className="-top-1.75 -right-1.75" />
							</div>

							{/* Subtitle */}
							<div className="px-4 py-5 text-center sm:px-8 sm:py-6">
								<p className="mx-auto max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
									All notable changes to MemoFS are documented here —
									architectural milestones, bug fixes, and feature additions
									across all workspace packages.
								</p>
								<p className="mx-auto mt-3 max-w-2xl font-mono text-[11px] leading-relaxed text-muted-foreground">
									<a
										href={SITE.githubReleasesUrl}
										target="_blank"
										rel="noreferrer"
										className="font-medium text-foreground underline decoration-dashed underline-offset-4 transition-colors hover:text-amber-400"
									>
										GitHub Releases
									</a>{" "}
									for tagged releases with notes.
								</p>
							</div>
						</div>

						{/* Bottom bar */}
						<div className="relative flex items-center justify-between border-x border-b border-dashed border-border px-4 py-2 font-mono text-[10px] text-muted-foreground/70 backdrop-blur-xs sm:px-6">
							<span>[source: changelog.mdx]</span>
							<span>[latest: {SITE.latestRelease}]</span>
						</div>
					</div>
				</section>

				<main className="mx-auto max-w-4xl px-4 pb-10 sm:px-6 sm:pb-12 lg:px-8">
					<div className="relative border-l border-dashed border-border pl-6 sm:pl-10">
						<DocsBody className="max-w-none">
							<Mdx components={changelogComponents} />
						</DocsBody>
					</div>
				</main>
				<Footer />
			</div>
		</HomeLayout>
	);
}
