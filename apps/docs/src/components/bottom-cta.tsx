import { Link } from "react-router";
import { ROUTES, SITE } from "~/lib/site";

export function BottomCta() {
	return (
		<section className="relative w-full border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80 bg-white dark:bg-black py-20 text-zinc-900 dark:text-white sm:py-28 transition-colors duration-300">
			<div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
				<span className="inline-flex rounded border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950 px-3 py-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
					MIT Licensed · Open Source
				</span>

				<h2 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
					One command. Your agent never forgets.
				</h2>

				<p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-400">
					Get started in under 2 minutes. Install the CLI or import the SDK
					directly into your TypeScript project.
				</p>

				<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
					<Link
						to={ROUTES.introduction}
						className="inline-flex h-10 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 px-5 text-sm font-medium transition-colors shadow-sm"
					>
						Get Started →
					</Link>
					<a
						href={SITE.githubUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex h-10 items-center justify-center rounded border border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white px-5 text-sm font-medium transition-colors"
					>
						Star on GitHub
					</a>
					<a
						href={SITE.productUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex h-10 items-center justify-center rounded border border-cyan-600/40 bg-cyan-50 hover:bg-cyan-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-cyan-500/50 dark:hover:bg-cyan-950/20 px-5 text-sm font-medium transition-colors"
					>
						MemoFS Cloud
					</a>
				</div>
			</div>
		</section>
	);
}
