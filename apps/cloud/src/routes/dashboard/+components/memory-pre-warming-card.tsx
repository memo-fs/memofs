import { useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { PLAN_ENTITLEMENTS, type PlanTier } from "~/lib/entitlements";

/**
 * Session pre-warming card.
 *
 * Pre-warming is a v1.1 capability (the hosted runtime Worker that keeps a
 * project's index hot). v1 surfaces the card so users see the entitlement on
 * their plan, but the live metric (startup latency) is not available until the
 * runtime is hosted — so we render an honest "launches with v1.1" state rather
 * than a fabricated number. The daily cap + usage come from the SSOT
 * (`PLAN_ENTITLEMENTS`) and the real `today` count from `getAccountUsage`.
 */
export function MemoryPreWarmingCard({
	plan,
	today,
}: {
	plan: PlanTier;
	today: number;
}) {
	const info = useMemo(() => {
		const limit = PLAN_ENTITLEMENTS[plan].maxPreWarmPerDay;
		const unlimited = !Number.isFinite(limit);
		const progress = unlimited
			? Math.min(((today || 1) / Math.max(today, 1)) * 100, 100)
			: limit > 0
				? Math.min((today / limit) * 100, 100)
				: 0;
		return { limitLabel: unlimited ? "∞" : limit, progress };
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
							{today} / {info.limitLabel}
						</span>
					</div>
					<Progress value={info.progress} className="h-1.5 rounded-none" />
				</div>
				<div className="text-[10px] font-mono text-muted-foreground pt-1">
					{plan === "free" ? (
						<span className="text-red-500/80">Requires Pro plan or higher</span>
					) : (
						<span>Live metrics launch with the hosted runtime (v1.1)</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
