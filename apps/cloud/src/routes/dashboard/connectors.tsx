import { Plug } from "lucide-react";
import { useOutletContext } from "react-router";
import { GithubMark } from "~/components/site/brand-icons";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { DashboardOutletContext } from "./_layout";
import { PageHeader } from "./+components/page-header";

/**
 * Connectors (SC3.3). Project-scoped (`connectors.json` is a per-project synced
 * file). At v1 there is NO cloud-side `connectors` table — connectors run locally
 * on the runtime per ADR Q1/Q2, configured via `.tekmemo/connectors.json`, so the
 * cloud truthfully reports 0 of the account's cap and surfaces the catalog as
 * informational only. When a table lands, this page becomes the live count
 * without changing the catalog shape.
 *
 * The cap (`maxConnectors`) comes from the real account entitlement snapshot via
 * the layout outlet context — the same source the overview + billing cards use.
 */

/** Catalog of connectors available at v1 (Linear is queued, Q10). Informational only. */
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

export function meta() {
	return [{ title: "Connectors — TekMemo Cloud" }];
}

export default function ConnectorsPage() {
	const { selectedProject, account } =
		useOutletContext<DashboardOutletContext>();
	const projectName = selectedProject?.name ?? "—";
	const maxConnectors = account?.maxConnectors ?? 0;
	// No cloud-side connector state exists at v1; the count is honestly 0.
	const activeCount = 0;

	return (
		<div className="p-6">
			<PageHeader
				title="Connectors"
				subtitle={
					<>
						Project{" "}
						<span className="font-mono font-semibold text-foreground">
							{projectName}
						</span>{" "}
						· {activeCount} / {maxConnectors} active
					</>
				}
			/>

			{/* Catalog (informational — what connectors exist at v1) */}
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
									<p className="text-xs font-medium text-foreground">
										{c.name}
									</p>
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

			{/* Honest empty state: connectors run locally, cloud shows none yet */}
			<Card>
				<CardContent className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
					<Plug className="h-8 w-8 text-muted-foreground/40" />
					<div>
						<p className="text-sm font-medium text-foreground">
							No connectors configured
						</p>
						<p className="mx-auto mt-1 max-w-md text-xs leading-normal text-muted-foreground">
							Connectors run locally on the TekMemo runtime and are configured
							in{" "}
							<code className="font-mono text-[10px]">
								.tekmemo/connectors.json
							</code>
							. The cloud shows none until that file is synced. Tokens are
							encrypted server-side and never written to your synced files.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
