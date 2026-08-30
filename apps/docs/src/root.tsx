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

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
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
