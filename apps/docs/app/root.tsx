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

export const meta: Route.MetaFunction = () => [
	{ title: "MemoFS — The File-First Memory Runtime for AI Agents" },
	{
		name: "description",
		content:
			"File-first memory runtime for AI agents. Store decisions as markdown in your repo. Local by default, cloud-ready. MIT licensed.",
	},
	{ name: "theme-color", content: "#258acb" },
	{ name: "msvalidate.01", content: "471697018F51A070DE0EAA3B6E96851E" },
	{ property: "og:site_name", content: "MemoFS" },
	{ property: "og:locale", content: "en_US" },
	{ property: "og:type", content: "website" },
	{
		property: "og:title",
		content: "MemoFS — The File-First Memory Runtime for AI Agents",
	},
	{
		property: "og:description",
		content:
			"File-first memory runtime for AI agents. Store decisions as markdown in your repo. Local by default, cloud-ready. MIT licensed.",
	},
	{
		property: "og:image",
		content: "https://docs.memofs.dev/og-default.png",
	},
	{ name: "twitter:card", content: "summary_large_image" },
	{ name: "twitter:site", content: "@memofsdev" },
	{ name: "twitter:creator", content: "@memofsdev" },
	{
		name: "twitter:title",
		content: "MemoFS — The File-First Memory Runtime for AI Agents",
	},
	{
		name: "twitter:description",
		content:
			"File-first memory runtime for AI agents. Store decisions as markdown in your repo. Local by default, cloud-ready. MIT licensed.",
	},
	{
		name: "twitter:image",
		content: "https://docs.memofs.dev/og-default.png",
	},
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
				<RootProvider search={{ options: { api: "/api/search" } }}>
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
