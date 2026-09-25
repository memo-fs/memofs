import { RootProvider } from "fumadocs-ui/provider/react-router";
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "react-router";
import { Footer } from "./components/footer";
import { Button } from "./components/ui/button";
import { baseOptions } from "./lib/layout.shared";
import { createPageMeta } from "./lib/meta";
import { ROUTES, SITE } from "./lib/site";

export const meta: Route.MetaFunction = () => [
	...createPageMeta({
		title: "MemoFS — The File-First Memory Runtime for AI Agents",
		description: SITE.description,
		path: ROUTES.home,
	}),
	{ name: "theme-color", content: "#258acb" },
	{ name: "msvalidate.01", content: "471697018F51A070DE0EAA3B6E96851E" },
	{ property: "og:locale", content: "en_US" },
];

export const links: Route.LinksFunction = () => [
	{ rel: "icon", type: "image/svg+xml", href: "/logo.svg" },
	{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				<RootProvider search={{ options: { api: "/search" } }}>
					{children}
				</RootProvider>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

function Crosshair({ className }: { className?: string }) {
	return (
		<svg
			className={`pointer-events-none absolute h-3.5 w-3.5 text-muted-foreground/70 animate-crosshair ${className}`}
			viewBox="0 0 14 14"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.2"
			aria-hidden="true"
		>
			<line x1="7" y1="0" x2="7" y2="14" />
			<line x1="0" y1="7" x2="14" y2="7" />
		</svg>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	if (isRouteErrorResponse(error) && error.status === 404) {
		return (
			<HomeLayout {...baseOptions()}>
				<div className="relative w-full bg-background text-foreground">
					<section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
						<div className="relative mx-auto w-full max-w-5xl">
							<div className="pointer-events-none absolute -left-6 -right-6 top-0 origin-center animate-line-x border-t border-dashed border-border/70 sm:-left-10 sm:-right-10" />
							<div className="pointer-events-none absolute -left-6 -right-6 bottom-0 origin-center animate-line-x border-b border-dashed border-border/70 sm:-left-10 sm:-right-10" />
							<div className="pointer-events-none absolute -top-6 -bottom-6 left-0 origin-top animate-line-y border-l border-dashed border-border/70 sm:-top-8 sm:-bottom-8" />
							<div className="pointer-events-none absolute -top-6 -bottom-6 right-0 origin-top animate-line-y border-r border-dashed border-border/70 sm:-top-8 sm:-bottom-8" />

							<Crosshair className="-top-1.75 -left-1.75" />
							<Crosshair className="-top-1.75 -right-1.75" />
							<Crosshair className="-bottom-1.75 -left-1.75" />
							<Crosshair className="-bottom-1.75 -right-1.75" />

							<div className="relative flex items-center justify-between border-x border-t border-dashed border-border px-4 py-2 font-mono text-xs text-muted-foreground backdrop-blur-xs sm:px-6">
								<span className="font-semibold text-foreground">
									~ <code>404</code>
								</span>
								<span className="hidden text-[10px] tracking-widest uppercase sm:inline">
									error / not_found
								</span>
							</div>

							<div className="relative border border-dashed border-border">
								<div className="relative px-4 py-8 text-center sm:px-8 sm:py-10">
									<div className="flex items-center justify-center gap-2">
										<span aria-hidden className="size-1.5 bg-amber-400" />
										<span className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-amber-400">
											404 — Not Found
										</span>
									</div>
									<h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-bold leading-[1.04] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-6xl">
										Page not found
									</h1>
								</div>

								<div className="relative border-t border-dashed border-border">
									<div className="pointer-events-none absolute inset-x-0 top-0 origin-left animate-line-x border-t border-dashed border-border" />
									<Crosshair className="-top-1.75 -left-1.75" />
									<Crosshair className="-top-1.75 -right-1.75" />
								</div>

								<div className="px-4 py-6 text-center sm:px-8 sm:py-7">
									<p className="mx-auto max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
										The page you’re looking for doesn’t exist. It may have been
										moved, renamed, or never existed in this memory plane.
									</p>
									<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
										<Button
											asChild
											size="lg"
											className="rounded-none font-bold tracking-wide"
										>
											<Link to={ROUTES.home}>Back to Home</Link>
										</Button>
										<Button
											asChild
											variant="secondary"
											size="lg"
											className="rounded-none font-bold tracking-wide"
										>
											<Link to={ROUTES.docs}>Browse Documentation</Link>
										</Button>
									</div>
								</div>
							</div>

							<div className="relative flex items-center justify-between border-x border-b border-dashed border-border px-4 py-2 font-mono text-[10px] text-muted-foreground/70 backdrop-blur-xs sm:px-6">
								<span>[status: 404]</span>
								<span>[ref: not_found]</span>
							</div>
						</div>
					</section>

					<Footer />
				</div>
			</HomeLayout>
		);
	}

	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = "Error";
		details = error.statusText || details;
	} else if (error && error instanceof Error) {
		console.error("ErrorBoundary caught error:", error);
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
