import { Link } from "react-router";
import { SITE_LINKS } from "~/lib/site";
import { GithubMark } from "./brand-icons";
import { LogoMark, Wordmark } from "./logo";

/**
 * Public-site footer (SC2).
 *
 * Premium Signal treatment over the original two-column structure: a large
 * faded wordmark backdrop, the product + project columns, and a bottom bar with
 * the copyright + API status link. Keeps the cross-app rule (SC1): cloud
 * marketing stays on `memofs.dev`, the OSS front door lives at
 * `docs.memofs.dev` — linked, not duplicated.
 */

const COLS = [
	{
		title: "Product",
		links: [
			{ label: "Use cases", to: "/use-cases" },
			{ label: "Pricing", to: "/pricing" },
			{ label: "Documentation ↗", href: SITE_LINKS.docs },
			{ label: "GitHub ↗", href: SITE_LINKS.github },
		],
	},
	{
		title: "Legal",
		links: [
			{ label: "Privacy", to: "/privacy" },
			{ label: "Terms", to: "/terms" },
		],
	},
] as const;

export function SiteFooter() {
	return (
		<footer className="relative mt-24 border-t border-border/60">
			<div className="mx-auto max-w-7xl px-6 sm:px-8">
				<div className="grid grid-cols-2 gap-8 py-12 sm:grid-cols-4">
					<div className="col-span-2 sm:col-span-2">
						<Link to="/" className="flex items-center gap-2.5">
							<LogoMark size={28} />
							<Wordmark />
						</Link>
						<p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
							Local-first memory for AI apps and coding agents. Secure file
							replication and hosted serverless query runtime.
						</p>
						<a
							href={SITE_LINKS.github}
							className="mt-4 inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
							rel="noreferrer"
							target="_blank"
							aria-label="GitHub"
						>
							<GithubMark className="size-4" />
						</a>
					</div>

					{COLS.map((col) => (
						<div key={col.title} className="flex flex-col gap-3">
							<span className="font-heading text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
								{col.title}
							</span>
							{col.links.map((link) =>
								"to" in link ? (
									<Link
										key={link.label}
										to={link.to}
										className="text-sm text-muted-foreground transition-colors hover:text-foreground"
									>
										{link.label}
									</Link>
								) : (
									<a
										key={link.label}
										href={link.href}
										className="text-sm text-muted-foreground transition-colors hover:text-foreground"
										rel="noreferrer"
										target="_blank"
									>
										{link.label}
									</a>
								),
							)}
						</div>
					))}
				</div>
			</div>

			<div className="border-t border-border/60">
				<div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
					<p>© {new Date().getFullYear()} Memo FS. All rights reserved.</p>
					<a href="/v1/health" className="hover:text-foreground">
						API status
					</a>
				</div>
			</div>
		</footer>
	);
}
