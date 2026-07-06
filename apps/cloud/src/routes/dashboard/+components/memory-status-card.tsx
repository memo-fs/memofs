import { Brain } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { RuntimeProviders } from "../memory";

interface MemoryStatusCardProps {
	plan: string;
	/** Hosted-runtime provider bundle (S3-Q8 open-core honesty line). */
	providers: RuntimeProviders;
}

export function MemoryStatusCard({ plan, providers }: MemoryStatusCardProps) {
	const info =
		plan === "teams"
			? { tier: "Teams", status: "Active (Production Runtime)" }
			: plan === "pro"
				? { tier: "Pro", status: "Active (Hosted Runtime)" }
				: { tier: "Free", status: "Deterministic Floor Only" };

	// Render only the roles actually bound; absent roles run the deterministic
	// zero-config default and are omitted (S3-Q8: honest, not boastful).
	const providerLine = [
		providers.embedder && `Embedder: ${providers.embedder}`,
		providers.extractor && `Extractor: ${providers.extractor}`,
		providers.reranker && `Reranker: ${providers.reranker}`,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-sm font-semibold flex items-center gap-2">
					<Brain className="w-4 h-4 text-white" />
					Runtime Status
				</CardTitle>
				<CardDescription className="text-xs">
					Managed execution environment
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<span className="text-xs text-muted-foreground block">
						Active Plan
					</span>
					<Badge className="mt-1 bg-white hover:bg-gray-200 text-black font-semibold rounded-none">
						{info.tier} Tier
					</Badge>
				</div>
				<div>
					<span className="text-xs text-muted-foreground block">
						Operational State
					</span>
					<div className="flex items-center gap-2 mt-1">
						<span
							className={cn("size-2 rounded-none", {
								"bg-green-500": plan !== "free",
								"bg-yellow-500": plan === "free",
							})}
						/>
						<span className="text-sm font-medium text-white">
							{info.status}
						</span>
					</div>
				</div>
				{providerLine ? (
					<div>
						<span className="text-xs text-muted-foreground block">
							Runtime providers
						</span>
						<p className="text-xs font-mono text-white/80 mt-1 leading-relaxed">
							{providerLine}
						</p>
						<p className="text-[10px] text-muted-foreground mt-1">
							The same `memofs-server` you could self-host — minus the ops.
						</p>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
