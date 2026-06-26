import { Outlet } from "react-router";
import { SiteFooter } from "~/components/site/site-footer";
import { SiteHeader } from "~/components/site/site-header";

/**
 * Public-site layout (SC2).
 *
 * Wraps every public Cloud route (landing, pricing, use-cases, legal) in the
 * shared `SiteHeader` + `SiteFooter`. This is a *pathless* layout per the
 * `react-router-auto-routes` convention: files under `_home/` map to root-level
 * URLs (e.g. `_home/pricing.tsx` → `/pricing`), with this layout rendered
 * around them and no `/home` segment in the URL.
 */
export default function HomeLayout() {
	return (
		<div className="relative flex min-h-dvh flex-col">
			<SiteHeader />
			<main className="flex-1">
				<Outlet />
			</main>
			<SiteFooter />
		</div>
	);
}
