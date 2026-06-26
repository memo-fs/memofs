import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import appStyles from "./styles/app.css?url";

/**
 * Root document shell.
 *
 * Deliberately minimal for v1 (P0.7): no theme provider, honeypot, toast, or
 * client-env injection — each of those is dashboard polish that was wired to a
 * Node-style `process.env` module (`env.server.ts`) that does not exist on the
 * Worker. They can be reintroduced incrementally once they read from the
 * Worker `env` binding (`context.cloudflare.env`) instead.
 */

export const links: Route.LinksFunction = () => [
	{ rel: "icon", href: "/favicon.ico", sizes: "32x32" },
	{ rel: "stylesheet", href: appStyles },
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>TekMemo Cloud</title>
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}
