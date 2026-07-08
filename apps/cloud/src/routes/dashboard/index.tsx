import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Link, useFetcher, useOutletContext } from "react-router";
import type { SyncActivity } from "~/.server/queries";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { buildNoindexMeta } from "~/lib/seo";
import { formatRelative } from "~/utils/misc";
import type { DashboardOutletContext } from "./_layout";
import { OverviewCards } from "./+components/overview-cards";
import { PageHeader } from "./+components/page-header";
import type { Route } from "./+types/index";

/** Shape returned by the `recent-activity` resource route. */
type RecentActivityResponse = { activity: SyncActivity[] };

export function meta() {
	return buildNoindexMeta("Dashboard — Memo FS Cloud");
}

export default function OverviewPage() {
	const { selectedProject, account, usage } =
		useOutletContext<DashboardOutletContext>();

	// The activity feed is project-scoped and follows the client-side selection
	// (the sidebar switches it without navigating), so it's fetched via a
	// resource route that reloads whenever `selectedProject` changes.
	const fetcher = useFetcher<RecentActivityResponse>();
	const projectId = selectedProject?.id;

	useEffect(() => {
		if (!projectId) return;
		fetcher.load(`/dashboard/recent-activity?projectId=${projectId}`);
	}, [fetcher, projectId]);

	const activity = fetcher.data?.activity ?? [];
	const loading = fetcher.state !== "idle";

	return (
		<div className="p-6">
			<PageHeader
				title="Overview"
				subtitle={
					selectedProject ? (
						<>
							Project{" "}
							<span className="font-mono font-semibold text-foreground">
								{selectedProject.name}
							</span>
						</>
					) : (
						"No project selected"
					)
				}
			/>

			<OverviewCards
				project={selectedProject}
				account={account}
				usage={usage}
			/>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-sm font-semibold">
								Recent activity
							</CardTitle>
							<CardDescription className="text-xs">
								{selectedProject
									? `Last 3 sync cursors for ${selectedProject.name}`
									: "Select a project to see activity"}
							</CardDescription>
						</div>
						<Button asChild size="sm" variant="outline" className="h-8 text-xs">
							<Link to="/dashboard/projects">View all</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
							<RefreshCw className="h-3.5 w-3.5 animate-spin" />
							Loading activity…
						</div>
					) : activity.length === 0 ? (
						<p className="py-4 text-xs text-muted-foreground">
							No sync activity yet. Push from the CLI to see cursors here.
						</p>
					) : (
						<div className="space-y-1">
							{activity.map((row) => (
								<div
									key={row.id}
									className="flex items-center justify-between border-b border-border/40 py-2 text-sm last:border-0"
								>
									<div className="flex items-center gap-3">
										<Badge
											variant="secondary"
											className="h-4 px-1.5 py-0 font-mono text-[9px] leading-none"
										>
											push
										</Badge>
										<code className="font-mono text-xs text-muted-foreground">
											#{row.cursor}
										</code>
									</div>
									<div className="flex items-center gap-4 text-xs text-muted-foreground">
										<span>{row.fileCount} files</span>
										<span>{formatRelative(row.at)}</span>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
