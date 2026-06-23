import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router";
import { MOCK_PROJECTS, type Project } from "~/utils/mock-data";
import { DashboardSidebar } from "./+components/dashboard-sidebar";

/**
 * Dashboard shell (SC3). Thin wrapper: desktop sidebar + responsive mobile
 * drawer + the routed page via `<Outlet />`. The selected project flows to
 * project-scoped pages through the outlet context.
 */
export default function DashboardLayout() {
	const [selectedProject, setSelectedProject] = useState<Project>(
		MOCK_PROJECTS[0],
	);
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<div className="hidden md:flex">
				<DashboardSidebar
					selectedProject={selectedProject}
					onSelectProject={setSelectedProject}
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
							selectedProject={selectedProject}
							onSelectProject={setSelectedProject}
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
					<span className="text-sm font-semibold">TekMemo Cloud</span>
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
					<Outlet context={{ selectedProject }} />
				</main>
			</div>
		</div>
	);
}
