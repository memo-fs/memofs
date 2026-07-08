import { RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { PLAN_ENTITLEMENTS, type PlanTier } from "~/lib/entitlements";
import { cn } from "~/lib/utils";

import type { ConsolidationResult } from "./consolidation-run-log";

interface MemoryConsolidationCardProps {
	plan: PlanTier;
	/** Real count of consolidation runs today (UTC) — from `getAccountUsage`. */
	runsToday: number;
	isConsolidating: boolean;
	onConsolidate: () => void;
	consolidationResult?: ConsolidationResult;
}

export function MemoryConsolidationCard({
	plan,
	runsToday,
	isConsolidating,
	onConsolidate,
	consolidationResult,
}: MemoryConsolidationCardProps) {
	const info = useMemo(() => {
		const cap = PLAN_ENTITLEMENTS[plan].maxConsolidationRuns;
		const unlimited = !Number.isFinite(cap);
		// Progress against the daily budget. Unlimited (Teams) renders a flat
		// "well within" bar so the metric stays meaningful without a finite cap.
		const progress = unlimited
			? Math.min(((runsToday || 1) / Math.max(runsToday, 1)) * 100, 100)
			: cap === 0
				? 0
				: Math.min((runsToday / cap) * 100, 100);
		return {
			limitLabel: unlimited ? "∞" : `${cap} / day`,
			progress,
		};
	}, [plan, runsToday]);

	// Disable the button when consolidating, or when the daily budget is
	// exhausted. `consolidationResult` only gates the optimistic label flip.
	const budgetExhausted =
		runsToday >= PLAN_ENTITLEMENTS[plan].maxConsolidationRuns;

	return (
		<Card className="flex flex-col justify-between">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-semibold">Consolidation</CardTitle>
					<Button
						variant="outline"
						size="sm"
						className="h-7 px-2 text-xs rounded-none"
						disabled={isConsolidating || budgetExhausted}
						onClick={onConsolidate}
					>
						<RefreshCw
							className={cn("w-3 h-3 mr-1.5", {
								"animate-spin": isConsolidating,
							})}
						/>
						{isConsolidating ? "Running..." : "Sync Now"}
					</Button>
				</div>
				<CardDescription className="text-xs">
					Merging nodes & duplicate reduction
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div>
					<div className="flex items-center justify-between text-xs mb-1">
						<span className="text-muted-foreground">Runs Today</span>
						<span className="font-mono text-white font-medium">
							{consolidationResult ? runsToday + 1 : runsToday} /{" "}
							{info.limitLabel}
						</span>
					</div>
					<Progress value={info.progress} className="h-1.5 rounded-none" />
				</div>
				<div className="text-[10px] font-mono text-muted-foreground pt-1">
					{budgetExhausted ? (
						<span>Daily limit reached — resets at 00:00 UTC</span>
					) : (
						<span>Manual runs decrement your daily budget</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
