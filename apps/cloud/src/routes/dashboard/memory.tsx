import { useEffect, useState } from "react";
import { useFetcher, useOutletContext } from "react-router";
import { getEnv } from "~/.server/context";
import { buildNoindexMeta } from "~/lib/seo";
import type { DashboardOutletContext } from "./_layout";
import type { ConsolidationResult } from "./+components/consolidation-run-log";
import { ConsolidationRunLog } from "./+components/consolidation-run-log";
import { MemoryConsolidationCard } from "./+components/memory-consolidation-card";
import type { MemoryItem } from "./+components/memory-explorer-card";
import { MemoryExplorerCard } from "./+components/memory-explorer-card";
import { MemoryPreWarmingCard } from "./+components/memory-pre-warming-card";
import { MemoryStatusCard } from "./+components/memory-status-card";
import { PageHeader } from "./+components/page-header";
import type { Route } from "./+types/memory";

/**
 * Which hosted-runtime providers are actually bound in this deployment.
 *
 * The cloud runs the *same* `memofs-server` an OSS self-hoster could run; this
 * surfaces the bundle we chose (S3-Q8 open-core honesty) so users can see exactly
 * which providers are processing their memory. `undefined` provider = that role
 * is running its deterministic zero-config default (no API key/binding set).
 */
export interface RuntimeProviders {
	/** Embedder role — Voyage when `VOYAGE_API_KEY` is set. */
	embedder?: string;
	/** Extractor role — Workers AI when the `AI` binding is present. */
	extractor?: string;
	/** Reranker role — Voyage when `VOYAGE_API_KEY` is set. */
	reranker?: string;
}

/**
 * Loader: resolve the hosted-runtime provider bundle from env, once per request.
 * Cheap (pure env reads, no DB/R2 hits) — the dashboard renders it in the
 * Runtime Status card's read-only "Runtime providers" line.
 */
export async function loader({ context }: Route.LoaderArgs) {
	const env = getEnv(context);
	const voyage = env.VOYAGE_API_KEY ? "Voyage" : undefined;
	const workersAi = env.AI ? "Workers AI" : undefined;
	const providers: RuntimeProviders = {
		embedder: voyage,
		extractor: workersAi,
		reranker: voyage,
	};
	return { providers };
}

export function meta() {
	return buildNoindexMeta("Memory Runtime — Memo FS Cloud");
}

export default function MemoryPage({ loaderData }: Route.ComponentProps) {
	const { providers } = loaderData;
	const { selectedProject, account, usage } =
		useOutletContext<DashboardOutletContext>();
	const [searchQuery, setSearchQuery] = useState("");

	const queryFetcher = useFetcher<{
		items: MemoryItem[];
		warnings?: string[];
	}>();
	const consolidationFetcher = useFetcher<{
		ok: boolean;
		result?: ConsolidationResult;
		error?: string;
	}>();

	const projectId = selectedProject?.id;

	// Load memories when project or search query changes
	useEffect(() => {
		if (!projectId) return;
		const query = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";
		queryFetcher.load(`/dashboard/memory-query?projectId=${projectId}${query}`);
	}, [projectId, searchQuery, queryFetcher]);

	const memories = queryFetcher.data?.items ?? [];
	const isLoading = queryFetcher.state !== "idle";
	const plan = account?.plan ?? "free";

	const handleConsolidate = () => {
		if (!projectId || plan === "free") return;
		consolidationFetcher.submit(
			{ projectId, intent: "consolidate" },
			{ method: "post", action: "/dashboard/memory-query" },
		);
	};

	const isConsolidating = consolidationFetcher.state !== "idle";

	return (
		<div className="p-6 space-y-6">
			<PageHeader
				title="Memory Runtime"
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

			<div className="grid gap-6 md:grid-cols-3">
				<MemoryStatusCard plan={plan} providers={providers} />
				<MemoryConsolidationCard
					plan={plan}
					runsToday={usage.consolidationUsedToday}
					isConsolidating={isConsolidating}
					onConsolidate={handleConsolidate}
					consolidationResult={consolidationFetcher.data?.result}
				/>
				<MemoryPreWarmingCard plan={plan} today={usage.preWarmUsedToday} />
			</div>

			<ConsolidationRunLog
				consolidationResult={consolidationFetcher.data?.result}
			/>

			<MemoryExplorerCard
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				memories={memories}
				isLoading={isLoading}
			/>
		</div>
	);
}
