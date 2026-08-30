/** Shared site footer rendered on marketing and changelog routes. */

import { Link } from "react-router";
import { FOOTER_NAVIGATION, ROUTES, SITE } from "../lib/site";
import { NewsletterSignup } from "./newsletter-signup";

const linkClassName =
	"hover:text-zinc-900 dark:hover:text-white transition-colors";

/** Renders the shared footer navigation and newsletter signup. */
export function Footer() {
	return (
		<footer className="relative w-full border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80 bg-white text-zinc-600 dark:bg-black dark:text-zinc-400 transition-colors">
			<div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="mb-12">
					<NewsletterSignup variant="strip" />
				</div>

				<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
					<div className="flex flex-col space-y-4">
						<Link to={ROUTES.home} className="flex items-center gap-2.5">
							<img
								src="/logo.svg"
								alt={SITE.name}
								className="size-6 shrink-0"
								width={24}
								height={24}
							/>
							<span className="font-bold text-base tracking-tight text-zinc-900 dark:text-white">
								{SITE.name}
							</span>
						</Link>
						<p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
							The file-first memory runtime for AI agents. Local by default,
							git-branchable, and cloud-ready.
						</p>
						<div className="pt-2">
							<span className="inline-flex items-center rounded border border-dashed border-zinc-300 px-2 py-0.5 font-mono text-[10px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
								MIT Licensed
							</span>
						</div>
					</div>

					{FOOTER_NAVIGATION.map((group) => (
						<div key={group.title} className="flex flex-col space-y-3">
							<h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
								{group.title}
							</h3>
							<ul className="space-y-2 text-xs">
								{group.links.map((link) => (
									<li key={link.href}>
										{"external" in link && link.external ? (
											<a
												href={link.href}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white transition-colors"
											>
												{link.label}{" "}
												<span className="text-[10px] text-zinc-400">↗</span>
											</a>
										) : (
											<Link to={link.href} className={linkClassName}>
												{link.label}
											</Link>
										)}
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				<div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-dashed border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800 sm:flex-row">
					<p>
						© {new Date().getFullYear()} MemoFS. Open source under MIT License.
					</p>
					<div className="flex items-center gap-4">
						<a
							href={`${SITE.githubUrl}/issues`}
							target="_blank"
							rel="noopener noreferrer"
							className={linkClassName}
						>
							Issues
						</a>
						<a
							href={`${SITE.githubUrl}/discussions`}
							target="_blank"
							rel="noopener noreferrer"
							className={linkClassName}
						>
							Discussions
						</a>
						<a
							href={SITE.productUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={linkClassName}
						>
							Cloud
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
