/**
 * Connector catalog grid (SC3.3).
 *
 * Static catalog of available connectors — informational only. The "+ Add"
 * button is on the page header, not here.
 */

import { GithubMark } from "~/components/site/brand-icons";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

const CATALOG = [
	{
		type: "github",
		name: "GitHub",
		desc: "Issues, PRs, and README files",
		icon: <GithubMark className="h-5 w-5" />,
		iconBg: "border border-zinc-800 bg-zinc-900 text-white",
		available: true,
	},
	{
		type: "notion",
		name: "Notion",
		desc: "Pages and databases",
		icon: <span className="text-sm font-bold">N</span>,
		iconBg:
			"border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
		available: true,
	},
	{
		type: "linear",
		name: "Linear",
		desc: "Issues and projects",
		icon: <span className="text-sm font-bold">L</span>,
		iconBg: "border border-primary/20 bg-primary/15 text-primary",
		available: false,
	},
] as const;

/**
 * Renders the static connector catalog grid — informational cards for each
 * available connector (GitHub, Notion, Linear). The "+ Add" button lives on
 * the page header, not here.
 */
export function ConnectorCatalog() {
	return (
		<section className="mb-8">
			<h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Available connectors
			</h4>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{CATALOG.map((c) => (
					<Card key={c.type} className={cn(!c.available && "opacity-50")}>
						<CardContent className="flex items-center gap-3 p-4">
							<div
								className={cn(
									"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
									c.iconBg,
								)}
							>
								{c.icon}
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-xs font-medium text-foreground">{c.name}</p>
								<p className="truncate text-[10px] text-muted-foreground">
									{c.desc}
								</p>
							</div>
							{!c.available && (
								<Badge variant="secondary" className="px-1 py-0 text-[9px]">
									Soon
								</Badge>
							)}
						</CardContent>
					</Card>
				))}
			</div>
		</section>
	);
}
