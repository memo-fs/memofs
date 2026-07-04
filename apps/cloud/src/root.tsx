import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
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
