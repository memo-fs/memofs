import { Menu, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Outlet } from "react-router";
import { getDB } from "~/.server/db";
import type { AccountView, ProjectSummary } from "~/.server/queries";
import { getAccountUsage, listProjectsForAccount } from "~/.server/queries";
import { requireUserWithAccount } from "~/.server/session";
import { DashboardSidebar } from "./+components/dashboard-sidebar";
import type { Route } from "./+types/_layout";

/**
 * Dashboard shell (SC3). Thin wrapper: desktop sidebar + responsive mobile
 * drawer + the routed page via `<Outlet />`. The selected project flows to
 * project-scoped pages through the outlet context.
 *
 * Auth gate: the loader runs `requireUser`, which throws a redirect to
 * `/login?redirect=...` for unauthenticated requests. Every dashboard route
 * inherits this guard by nesting under this layout.
 *
 * Data: the loader resolves the signed-in user, their billing account, and the
 * full project list from the real DB. The selected project is client-side state
 * seeded from the default project — the sidebar switches it, and project-scoped
 * pages + the recent-activity feed follow it via the outlet context + a
 * `fetcher.load` resource route.
 */

/** Server data resolved once per dashboard navigation. */
export interface DashboardLoaderData {
	user: {
		id: string;
		name: string;
		email: string;
		image: string | null;
	};
	projects: ProjectSummary[];
	account: AccountView | null;
	usage: {
		storageBytes: number;
		connectorsUsed: number;
		consolidationUsedToday: number;
		preWarmUsedToday: number;
	};
}

/** Typed shape passed via `<Outlet context={…} />` to nested dashboard routes. */
export interface DashboardOutletContext {
	projects: ProjectSummary[];
	selectedProject: ProjectSummary | null;
	setSelectedProject: (project: ProjectSummary) => void;
	account: AccountView | null;
	usage: {
		storageBytes: number;
		connectorsUsed: number;
		consolidationUsedToday: number;
		preWarmUsedToday: number;
	};
}

export async function loader({
	request,
}: Route.LoaderArgs): Promise<DashboardLoaderData> {
	const { user, account } = await requireUserWithAccount(request);
	const db = getDB();

	// Provisioning is best-effort: an account may be missing only if signup
	// provisioning raced. Degrade gracefully (null account → zeroed usage) rather
	// than blocking the user out of their dashboard.
	const [projects, usage] = await Promise.all([
		account
			? listProjectsForAccount(db, account.id)
			: Promise.resolve([] as ProjectSummary[]),
		account
			? getAccountUsage(db, account.id)
			: Promise.resolve({
					storageBytes: 0,
					connectorsUsed: 0,
					consolidationUsedToday: 0,
					preWarmUsedToday: 0,
				}),
	]);

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
		},
		projects,
		account,
		usage,
	};
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
	const { projects, account, usage } = loaderData;

	// Seed the selection with the default project (or the first). `useMemo` so the
	// initial value is stable across re-renders but recomputes if the project list
	// identity changes after a navigation re-runs the loader.
	const initial = useMemo<ProjectSummary | null>(
		() => projects.find((p) => p.isDefault) ?? projects[0] ?? null,
		[projects],
	);
	const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(
		initial,
	);
	const [sidebarOpen, setSidebarOpen] = useState(false);

	// Keep the selection valid if the list changes (a re-run that drops the
	// previously-selected id falls back to the default/first).
	const current =
		selectedProject && projects.some((p) => p.id === selectedProject.id)
			? selectedProject
			: initial;

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<div className="hidden md:flex">
				<DashboardSidebar
					user={loaderData.user}
					projects={projects}
					selectedProject={current}
					onSelectProject={setSelectedProject}
					account={account}
				/>
			</div>

			{sidebarOpen && (
				<div className="fixed inset-0 z-50 flex md:hidden">
					<button
						type="button"
						aria-label="Close sidebar"
						className="absolute inset-0 h-full w-full cursor-default bg-black/40"
						onClick={() => setSidebarOpen(false)}
					/>
					<div className="relative z-10 h-full">
						<DashboardSidebar
							user={loaderData.user}
							projects={projects}
							selectedProject={current}
							onSelectProject={(p) => {
								setSelectedProject(p);
								setSidebarOpen(false);
							}}
							account={account}
						/>
					</div>
				</div>
			)}

			<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
				<div className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4 md:hidden">
					<button
						type="button"
						onClick={() => setSidebarOpen(true)}
						className="cursor-pointer rounded-md p-1 hover:bg-accent"
					>
						<Menu className="h-5 w-5" />
					</button>
					<span className="text-sm font-semibold">Memo FS Cloud</span>
					{sidebarOpen && (
						<button
							type="button"
							onClick={() => setSidebarOpen(false)}
							className="ml-auto cursor-pointer rounded-md p-1 hover:bg-accent"
						>
							<X className="h-5 w-5" />
						</button>
					)}
				</div>

				<main className="container mx-auto max-w-7xl flex-1 overflow-y-auto">
					<Outlet
						context={
							{
								projects,
								selectedProject: current,
								setSelectedProject,
								account,
								usage,
							} satisfies DashboardOutletContext
						}
					/>
				</main>
			</div>
		</div>
	);
}
