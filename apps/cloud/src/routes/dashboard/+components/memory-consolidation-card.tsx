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
import { cn } from "~/lib/utils";

import type { ConsolidationResult } from "./consolidation-run-log";

interface MemoryConsolidationCardProps {
	plan: string;
	isConsolidating: boolean;
	onConsolidate: () => void;
	consolidationResult?: ConsolidationResult;
}

export function MemoryConsolidationCard({
	plan,
	isConsolidating,
	onConsolidate,
	consolidationResult,
}: MemoryConsolidationCardProps) {
	const info = useMemo(() => {
		switch (plan) {
			case "teams":
				return {
					limit: "Unlimited",
					runsToday: consolidationResult ? 19 : 18,
					progress: 35,
				};
			case "pro":
				return {
					limit: "24 / day",
					runsToday: consolidationResult ? 5 : 4,
					progress: 16.6,
				};
			default:
				return {
					limit: "1 / day",
					runsToday: 1,
					progress: 100,
				};
		}
	}, [plan, consolidationResult]);

	return (
		<Card className="flex flex-col justify-between">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-semibold">Consolidation</CardTitle>
					<Button
						variant="outline"
						size="sm"
						className="h-7 px-2 text-xs rounded-none"
						disabled={isConsolidating || plan === "free"}
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
							{info.runsToday} / {info.limit}
						</span>
					</div>
					<Progress value={info.progress} className="h-1.5 rounded-none" />
				</div>
				<div className="text-[10px] font-mono text-muted-foreground pt-1">
					{plan === "free" ? (
						<span>Nightly run locked at 02:00 UTC</span>
					) : (
						<span>Next run scheduled in 42 minutes</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
