import { type ErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { RootErrorUI } from "~/components/error-boundary";
import type { Route } from "./+types/root";
import appStyles from "./styles/app.css?url";

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
				{/*
				 * Title is owned by route `meta()` exports (rendered via `<Meta />`).
				 * A static `<title>` here would shadow or duplicate them; the last
				 * `title` entry wins, so leaving route titles as the sole source.
				 */}
				<meta name="theme-color" content="#0a0a0a" />
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

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	return <RootErrorUI error={error as ErrorResponse | Error} />;
}
