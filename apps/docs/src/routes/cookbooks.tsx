import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "react-router";
import { CookbookIndex } from "../components/cookbook-index";
import { Footer } from "../components/footer";
import { baseOptions } from "../lib/layout.shared";
import { createPageMeta } from "../lib/meta";
import { ROUTES } from "../lib/site";
import type { Route } from "./+types/cookbooks";

export const meta: Route.MetaFunction = () => {
	const pageTitle = "Cookbooks & Integration Recipes — MemoFS";
	const description =
		"Step-by-step practical integration recipes for connecting MemoFS to AI coding assistants (Claude Code, Cursor, Copilot, Cline, Aider), agent frameworks, and custom SDKs.";

	return createPageMeta({
		title: pageTitle,
		description,
		path: ROUTES.cookbooks,
	});
};

export default function CookbooksPage() {
	return (
		<HomeLayout {...baseOptions()}>
			<div className="relative w-full bg-white text-zinc-900 dark:bg-black dark:text-white transition-colors duration-300">
				{/* Top Hero / Header Section */}
				<div className="border-b border-dashed border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 py-16 sm:py-20">
					<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
						<div className="max-w-3xl">
							<span className="inline-flex items-center rounded border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
								Recipes & How-To Guides
							</span>
							<h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
								MemoFS Cookbooks
							</h1>
							<p className="mt-4 text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
								Step-by-step practical integration recipes for connecting MemoFS
								persistent memory to your favourite AI coding agents, autonomous
								frameworks, and custom SDKs.
							</p>
						</div>
					</div>
				</div>

				{/* Main Cookbooks Catalog Container */}
				<div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
					<CookbookIndex />
				</div>

				{/* Bottom CTA Block */}
				<div className="border-t border-dashed border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 py-16">
					<div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
						<h2 className="text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">
							Need a custom agent integration?
						</h2>
						<p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
							MemoFS works seamlessly with any tool that speaks Model Context
							Protocol (MCP) or imports our TypeScript SDK.
						</p>
						<div className="mt-6 flex items-center justify-center gap-3">
							<Link
								to="/docs/introduction"
								className="inline-flex h-9 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 px-4 text-xs font-medium transition-colors"
							>
								Explore Documentation →
							</Link>
							<a
								href="https://github.com/memo-fs/memofs"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex h-9 items-center justify-center rounded border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 px-4 text-xs font-medium transition-colors"
							>
								View on GitHub
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
