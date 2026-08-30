import { Link } from "react-router";
import { NewsletterSignup } from "~/components/newsletter-signup";

export function Footer() {
	return (
		<footer className="relative w-full border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80 bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 transition-colors duration-300">
			<div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				{/* Newsletter Signup Strip */}
				<div className="mb-12">
					<NewsletterSignup variant="strip" />
				</div>

				<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
					{/* Col 1: Brand & Bio */}
					<div className="flex flex-col space-y-4">
						<Link to="/" className="flex items-center gap-2.5">
							<img
								src="/logo.svg"
								alt="MemoFS"
								className="size-6 shrink-0"
								width={24}
								height={24}
							/>
							<span className="font-bold text-zinc-900 dark:text-white text-base tracking-tight">
								MemoFS
							</span>
						</Link>
						<p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
							The file-first memory runtime for AI agents. Local by default,
							git-branchable, and cloud-ready.
						</p>
						<div className="pt-2">
							<span className="inline-flex items-center rounded border border-dashed border-zinc-300 dark:border-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-600 dark:text-zinc-400">
								MIT Licensed · v1.3.0
							</span>
						</div>
					</div>

					{/* Col 2: Documentation */}
					<div className="flex flex-col space-y-3">
						<h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
							Documentation
						</h3>
						<ul className="space-y-2 text-xs">
							<li>
								<Link
									to="/docs/introduction"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									Introduction
								</Link>
							</li>
							<li>
								<Link
									to="/docs"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									Quick Start
								</Link>
							</li>
							<li>
								<Link
									to="/docs/core"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									Core SDK & Runtime
								</Link>
							</li>
							<li>
								<Link
									to="/docs/mcp"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									MCP Server
								</Link>
							</li>
							<li>
								<Link
									to="/docs/cli"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									CLI Reference
								</Link>
							</li>
							<li>
								<Link
									to="/docs/server"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									Self-Hosting
								</Link>
							</li>
						</ul>
					</div>

					{/* Col 3: Ecosystem & Adapters */}
					<div className="flex flex-col space-y-3">
						<h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
							Ecosystem
						</h3>
						<ul className="space-y-2 text-xs">
							<li>
								<Link
									to="/docs/adapters/ai-sdk"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									Vercel AI SDK
								</Link>
							</li>
							<li>
								<Link
									to="/docs/adapters/transformers"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									Transformers.js
								</Link>
							</li>
							<li>
								<Link
									to="/docs/adapters/openai"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									OpenAI Embeddings
								</Link>
							</li>
							<li>
								<Link
									to="/docs/adapters/voyage"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									Voyage AI
								</Link>
							</li>
							<li>
								<Link
									to="/docs/adapters/r2"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									Cloudflare R2
								</Link>
							</li>
							<li>
								<Link
									to="/docs/adapters/turso"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									Turso (libSQL)
								</Link>
							</li>
						</ul>
					</div>

					{/* Col 4: Resources & AI */}
					<div className="flex flex-col space-y-3">
						<h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
							Resources & AI
						</h3>
						<ul className="space-y-2 text-xs">
							<li>
								<Link
									to="/cookbooks"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									Cookbooks
								</Link>
							</li>
							<li>
								<Link
									to="/changelog"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									Changelog
								</Link>
							</li>
							<li>
								<Link
									to="/docs/api"
									className="hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									API Reference
								</Link>
							</li>
							<li>
								<a
									href="/llms.txt"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									llms.txt <span className="text-[10px] text-zinc-400">↗</span>
								</a>
							</li>
							<li>
								<a
									href="/llms-full.txt"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									llms-full.txt{" "}
									<span className="text-[10px] text-zinc-400">↗</span>
								</a>
							</li>
							<li>
								<a
									href="https://github.com/memo-fs/memofs"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									GitHub <span className="text-[10px] text-zinc-400">↗</span>
								</a>
							</li>
							<li>
								<a
									href="https://x.com/memofsdev"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white transition-colors"
								>
									X (@memofsdev){" "}
									<span className="text-[10px] text-zinc-400">↗</span>
								</a>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom sub-footer line */}
				<div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-dashed border-zinc-200 dark:border-zinc-800/80 pt-6 sm:flex-row text-xs text-zinc-500">
					<p>
						© {new Date().getFullYear()} MemoFS. Open source under MIT License.
					</p>
					<div className="flex items-center gap-4">
						<a
							href="https://github.com/memo-fs/memofs/issues"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
						>
							Issues
						</a>
						<a
							href="https://github.com/memo-fs/memofs/discussions"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
						>
							Discussions
						</a>
						<a
							href="https://memofs.dev"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
						>
							Cloud
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
