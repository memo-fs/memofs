import { useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

export interface ConsolidationResult {
	plan?: {
		merges: number;
		retiredEdges: number;
		retiredNodes: number;
		changed: boolean;
		now: string;
	};
	mergesApplied: number;
	retirementsApplied: number;
	applied: boolean;
}

export function ConsolidationRunLog({
	consolidationResult,
}: {
	consolidationResult?: ConsolidationResult;
}) {
	const logEntries = useMemo(() => {
		const base = [
			{
				time: "[10:14:22]",
				status: "SUCCESS",
				message:
					"Consolidation complete. 0 conflicts resolved, 2 notes merged.",
			},
			{
				time: "[08:42:15]",
				status: "SUCCESS",
				message: "Consolidation complete. 1 duplicate memory path pruned.",
			},
			{
				time: "[06:12:08]",
				status: "SUCCESS",
				message: "Pre-warming batch complete. 14 isolates provisioned.",
			},
		];

		if (consolidationResult) {
			const timeStr = `[${new Date(consolidationResult.plan?.now || Date.now()).toLocaleTimeString()}]`;
			return [
				{
					time: timeStr,
					status: "SUCCESS",
					message: `Consolidation complete. ${consolidationResult.mergesApplied} merges applied, ${consolidationResult.retirementsApplied} retirements applied.`,
				},
				...base,
			];
		}
		return base;
	}, [consolidationResult]);

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-sm font-semibold">
					Consolidation Run Log
				</CardTitle>
				<CardDescription className="text-xs">
					Background ledger of duplicate resolution and memory optimization runs
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-2 font-mono text-xs">
					{logEntries.map((entry) => (
						<div
							key={`${entry.time}-${entry.message}`}
							className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0"
						>
							<span className="text-muted-foreground shrink-0">
								{entry.time}
							</span>
							<span className="text-green-500">{entry.status}</span>
							<span className="text-muted-foreground">{entry.message}</span>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
