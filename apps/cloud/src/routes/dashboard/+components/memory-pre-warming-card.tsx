import { useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";

export function MemoryPreWarmingCard({
	plan,
	today,
}: {
	plan: string;
	today: number;
}) {
	const info = useMemo(() => {
		const limit = plan === "teams" ? Infinity : plan === "pro" ? 48 : 0;
		const progress =
			limit === Infinity ? 100 : limit > 0 ? (today / limit) * 100 : 0;
		return { limit, today, progress };
	}, [plan, today]);

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-sm font-semibold">
					Session Pre-warming
				</CardTitle>
				<CardDescription className="text-xs">
					Cold-start latency optimization
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div>
					<div className="flex items-center justify-between text-xs mb-1">
						<span className="text-muted-foreground">Pre-warmed Sessions</span>
						<span className="font-mono text-white font-medium">
							{info.today} / {info.limit === Infinity ? "∞" : info.limit}
						</span>
					</div>
					<Progress value={info.progress} className="h-1.5 rounded-none" />
				</div>
				<div className="text-[10px] font-mono text-muted-foreground pt-1">
					{plan === "free" ? (
						<span className="text-red-500/80">Requires Pro plan or higher</span>
					) : (
						<span className="text-green-500/80">
							Avg. startup latency: 12ms
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
