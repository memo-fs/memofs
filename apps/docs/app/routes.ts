import type { RouteConfig } from "@react-router/dev/routes";
import { autoRoutes } from "react-router-auto-routes";

/**
 * Route Configuration
 *
 * Official Docs: https://github.com/kenn/react-router-auto-routes
 */
export default autoRoutes({
	ignoredRouteFiles: ["**/README.md", "**/*.test.{ts,tsx}", "**/__tests__/**"],
	paramChar: "$",
	colocationChar: "+",
	routeRegex: /\.(ts|tsx|js|jsx|md|mdx)$/,
}) satisfies RouteConfig;
