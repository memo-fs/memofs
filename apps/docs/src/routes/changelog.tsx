/**
 * Marketing route for the canonical MDX changelog. The release history itself
 * lives in content/docs/changelog.mdx so it is shared with the docs route and
 * LLM exports without a second hand-maintained dataset.
 */

import { DocsBody } from "fumadocs-ui/layouts/docs/page";
import { HomeLayout } from "fumadocs-ui/layouts/home";
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
					<DocsBody className="max-w-none">
						<Mdx
							components={useMDXComponents({
								a: createRelativeLink(source, { url: ROUTES.changelog }),
							})}
						/>
					</DocsBody>
				</main>
				<Footer />
			</div>
		</HomeLayout>
	);
}
