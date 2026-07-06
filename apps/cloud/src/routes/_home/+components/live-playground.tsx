import { Play, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { SectionHeading } from "~/components/site/terminal";
import { Section } from "~/components/site/visuals";
import { cn } from "~/lib/utils";
import { PLAYGROUND_QUERIES } from "../+utils/landing-content";

/**
 * LivePlayground — an interactive prompt sandbox displaying simulated queries
 * streaming from the serverless vector database.
 */
export function LivePlayground() {
	const [state, setState] = useState({
		queryIndex: 0,
		visibleLines: PLAYGROUND_QUERIES[0].response.length,
		isStreaming: false,
	});

	const activeQuery = PLAYGROUND_QUERIES[state.queryIndex];

	const handleQueryClick = (index: number) => {
		setState({
			queryIndex: index,
			visibleLines: 0,
			isStreaming: true,
		});
	};

	useEffect(() => {
		if (!state.isStreaming) return;

		const targetCount = PLAYGROUND_QUERIES[state.queryIndex].response.length;
		if (state.visibleLines >= targetCount) {
			setState((prev) => ({ ...prev, isStreaming: false }));
			return;
		}

		const timer = setTimeout(() => {
			setState((prev) => ({
				...prev,
				visibleLines: prev.visibleLines + 1,
			}));
		}, 250);

		return () => clearTimeout(timer);
	}, [state.isStreaming, state.visibleLines, state.queryIndex]);

	return (
		<Section className="py-20">
			<SectionHeading
				eyebrow="Interactive Demo"
				title={<>Query your memories live</>}
				lede="Click any pre-written query below to test how our hosted serverless query engine responds in real-time."
			/>

			<div className="mt-12 grid gap-6 lg:grid-cols-5">
				{/* Query Prompts */}
				<div className="lg:col-span-2 flex flex-col gap-3">
					{PLAYGROUND_QUERIES.map((q, idx) => (
						<button
							key={q.query}
							type="button"
							onClick={() => handleQueryClick(idx)}
							className={cn(
								"w-full text-left p-4 border transition-all duration-300 flex items-center justify-between group cursor-pointer rounded-none",
								state.queryIndex === idx
									? "border-accent-gold bg-accent-gold/5 text-foreground shadow-[0_0_15px_rgba(245,158,11,0.05)]"
									: "border-border bg-card/30 text-muted-foreground hover-glow-gold hover:text-foreground",
							)}
						>
							<span className="text-xs font-mono font-medium leading-relaxed">
								{q.query}
							</span>
							<Play
								className={cn(
									"size-3.5 shrink-0 transition-transform duration-200",
									state.queryIndex === idx
										? "text-accent-gold translate-x-0.5"
										: "text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5",
								)}
							/>
						</button>
					))}
				</div>

				{/* Output Sandbox Terminal */}
				<div className="lg:col-span-3 bg-premium-card hover-glow-primary p-5 font-mono text-[11px] sm:text-xs leading-relaxed text-foreground flex flex-col justify-between min-h-[260px] relative rounded-none">
					<div className="absolute top-3 right-3 flex items-center gap-1 text-[9px] uppercase tracking-wider text-accent-gold/80">
						<Sparkles className="size-3 text-accent-gold" />
						<span>Serverless Query Engine</span>
					</div>

					<div className="space-y-3 pt-4">
						<div className="flex gap-2 text-muted-foreground">
							<span className="text-accent-gold font-bold">&gt;</span>
							<span>{activeQuery.query}</span>
						</div>

						<div className="space-y-1.5 border-t border-border/40 pt-3">
							{activeQuery.response.slice(0, state.visibleLines).map((line) => {
								if (line.startsWith("```")) return null; // Simple formatting skip
								return (
									<div key={line} className="text-muted-foreground flex gap-2">
										<span className="text-muted-foreground/30 select-none">
											::
										</span>
										<span>{line}</span>
									</div>
								);
							})}
						</div>
					</div>

					{state.isStreaming && (
						<div className="text-[10px] text-accent-gold/80 animate-pulse mt-4 flex items-center gap-1.5">
							<span className="size-1.5 bg-accent-gold rounded-full animate-ping" />
							Scanning vector space...
						</div>
					)}
				</div>
			</div>
		</Section>
	);
}
