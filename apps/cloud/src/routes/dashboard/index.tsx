import { Link, useOutletContext } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { type DashboardOutletContext, formatRelative } from "~/utils/mock-data";
import { OverviewCards } from "./+components/overview-cards";
import { PageHeader } from "./+components/page-header";

const RECENT_ACTIVITY = [
	{ cursor: "cur_xyz789", fileCount: 247, at: "2026-06-22T14:30:00Z" },
	{ cursor: "cur_mno456", fileCount: 245, at: "2026-06-21T10:00:00Z" },
	{ cursor: "cur_def123", fileCount: 241, at: "2026-06-20T08:30:00Z" },
];

export function meta() {
	return [{ title: "Dashboard — TekMemo Cloud" }];
}

export default function OverviewPage() {
	const { selectedProject } = useOutletContext<DashboardOutletContext>();

	return (
		<div className="p-6">
			<PageHeader
				title="Overview"
				subtitle={
					<>
						Project{" "}
						<span className="font-mono font-semibold text-foreground">
							{selectedProject.name}
						</span>
					</>
				}
			/>

			<OverviewCards project={selectedProject} />

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-sm font-semibold">
								Recent activity
							</CardTitle>
							<CardDescription className="text-xs">
								Last 3 sync cursors for {selectedProject.name}
							</CardDescription>
						</div>
						<Button asChild size="sm" variant="outline" className="h-8 text-xs">
							<Link to="/dashboard/projects">View all</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-1">
						{RECENT_ACTIVITY.map((row) => (
							<div
								key={row.cursor}
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
										{row.cursor}
									</code>
								</div>
								<div className="flex items-center gap-4 text-xs text-muted-foreground">
									<span>{row.fileCount} files</span>
									<span>{formatRelative(row.at)}</span>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
