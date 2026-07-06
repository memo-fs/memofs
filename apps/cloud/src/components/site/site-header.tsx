import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router";
import { Button } from "~/components/ui/button";
import { SITE_LINKS } from "~/lib/site";
import { cn } from "~/lib/utils";
import { GithubMark } from "./brand-icons";
import { Logo } from "./logo";

/**
 * Public-site header (SC1 / SC2).
 *
 * Shared chrome for the marketing + legal pages. Responsive drawer navigation
 * on mobile screens, sticky glass header on desktops, and clean brand actions.
 *
 * NOTE: Login and "Get started" buttons are commented out while the app is in
 * waitlist-only mode. Re-enable them when public sign-ups open.
 */

const NAV = [
	{ to: "/use-cases", label: "Use cases" },
	{ to: "/pricing", label: "Pricing" },
] as const;

export function SiteHeader() {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<header className="sticky top-0 z-40">
			{/* Announcement strip — single accent line, dismissible feel without state. */}
			{/* <div className="border-b border-border/60">
				<div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-6 py-1.5 text-center">
					<span className="size-1.5  animate-pulse" aria-hidden />
					<span className="font-mono text-xs text-muted-foreground">
						Memo FS Cloud sync is live —{" "}
						<Link
							to="/signup"
							className="text-foreground underline-offset-4 hover:underline"
						>
							start free
						</Link>
					</span>
				</div>
			</div> */}

			<div
				className={cn(
					"border-b border-border/60 bg-background/70 backdrop-blur-xl",
					"[box-shadow:inset_0_-1px_0_oklch(1_0_0/0.04)]",
				)}
			>
				<div className="mx-auto flex h-16 max-w-7xl container items-center justify-between px-6 sm:px-8">
					<Link
						to="/"
						className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
						onClick={() => setMobileOpen(false)}
					>
						<Logo />
					</Link>

					{/* Desktop Nav */}
					<nav className="hidden md:flex items-center gap-1">
						{NAV.map((item) => (
							<NavLink
								key={item.to}
								to={item.to}
								className={({ isActive }) =>
									cn(
										"rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
										isActive && "text-foreground",
									)
								}
							>
								{item.label}
							</NavLink>
						))}
						<a
							href={SITE_LINKS.docs}
							className="px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
							rel="noreferrer"
							target="_blank"
						>
							Docs ↗
						</a>
						<a
							href={SITE_LINKS.github}
							rel="noreferrer"
							target="_blank"
							aria-label="GitHub"
						>
							<GithubMark className="size-4" />
						</a>
						<span aria-hidden className="mx-2 h-5 w-px bg-border" />
						{/* Login — hidden while in waitlist-only mode */}
						{/* <NavLink
							to="/login"
							className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							Login
						</NavLink> */}
						{/* Get started — hidden while in waitlist-only mode */}
						{/* <Button asChild size="sm" className="ml-1 h-8 rounded-md px-3 text-sm">
							<Link to="/signup">
								Get started
								<ArrowRight className="size-3.5" />
							</Link>
						</Button> */}
						<Button
							asChild
							size="sm"
							className="ml-1 h-8 rounded-md px-3 text-sm"
						>
							<Link to="/waitlist">
								Join waitlist
								<ArrowRight className="size-3.5" />
							</Link>
						</Button>
					</nav>

					{/* Mobile Menu Button */}
					<button
						type="button"
						className="flex md:hidden p-2 rounded-md hover:bg-muted/50 text-foreground transition-colors"
						onClick={() => setMobileOpen((v) => !v)}
						aria-label="Toggle menu"
					>
						{mobileOpen ? (
							<X className="size-5" />
						) : (
							<Menu className="size-5" />
						)}
					</button>
				</div>

				{/* Mobile Drawer */}
				{mobileOpen && (
					<div className="md:hidden border-t border-border/40 bg-background/95 px-6 py-4 flex flex-col gap-3 animate-in fade-in-0 duration-200 backdrop-blur-xl">
						{NAV.map((item) => (
							<Link
								key={item.to}
								to={item.to}
								className="text-sm font-medium py-1.5 text-muted-foreground hover:text-foreground transition-colors"
								onClick={() => setMobileOpen(false)}
							>
								{item.label}
							</Link>
						))}
						<a
							href={SITE_LINKS.docs}
							className="text-sm font-medium py-1.5 text-muted-foreground hover:text-foreground transition-colors"
							rel="noreferrer"
							target="_blank"
							onClick={() => setMobileOpen(false)}
						>
							Docs ↗
						</a>
						<a
							href={SITE_LINKS.github}
							rel="noreferrer"
							target="_blank"
							aria-label="GitHub"
						>
							<GithubMark className="size-4" />
						</a>
						<span aria-hidden className="h-px bg-border/40 my-1" />

						{/* Login — hidden while in waitlist-only mode */}
						{/* <Link
							to="/login"
							className="text-sm font-medium py-1.5 text-muted-foreground hover:text-foreground transition-colors"
							onClick={() => setMobileOpen(false)}
						>
							Login
						</Link> */}
						{/* Get started — hidden while in waitlist-only mode */}
						{/* <Button asChild size="sm" className="h-9 rounded-md w-full justify-center text-sm">
							<Link to="/signup" onClick={() => setMobileOpen(false)}>
								Get started
								<ArrowRight className="size-4 ml-1.5" />
							</Link>
						</Button> */}
						<Button
							asChild
							size="sm"
							className="h-9 rounded-md w-full justify-center text-sm"
						>
							<Link to="/waitlist" onClick={() => setMobileOpen(false)}>
								Join waitlist
								<ArrowRight className="size-4 ml-1.5" />
							</Link>
						</Button>
					</div>
				)}
			</div>
		</header>
	);
}
