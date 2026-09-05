import { cn } from "~/lib/utils";
import { FEATURES } from "./features/feature-data";

export function FeaturesSection() {
	return (
		<section
			id="features"
			className="relative w-full border-t border-dashed border-border bg-background py-20 text-foreground sm:py-28 transition-colors duration-300"
		>
			<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="mb-16 text-center">
					<p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
						Features &amp; Capabilities
					</p>
					<h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						Engineered for autonomous agent memory
					</h2>
					<p className="mt-4 text-base text-muted-foreground max-w-2xl mx-auto">
						From sub-millisecond local hybrid recall to self-healing code
						anchors and multi-agent coordination. Built with transparent files,
						deterministic logic, and zero black boxes.
					</p>
				</div>

				{/* 3-Column Multi-Row Diagram Cards */}
				<div className="grid grid-cols-1 border-t border-l border-dashed border-border md:grid-cols-3">
					{FEATURES.map((feature) => {
						const DiagramComponent = feature.diagram;
						return (
							<div
								key={feature.id}
								className={cn(
									"group relative flex flex-col justify-between p-8 border-b border-r border-dashed border-border transition-all",
									feature.isImplemented
										? "hover:bg-muted/60"
										: "bg-muted/60 opacity-75 hover:opacity-100 hover:bg-accent/50",
								)}
							>
								<div>
									{/* Card Top Meta */}
									<div className="flex items-center justify-between">
										<span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
											{feature.numberLabel}
										</span>
										{feature.isImplemented ? (
											<span className="font-mono text-[10px] text-muted-foreground border border-border px-2 py-0.5 bg-secondary">
												{feature.badge}
											</span>
										) : (
											<span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-500/30 px-2 py-0.5 bg-amber-50/80 dark:bg-amber-950/30">
												{feature.badge}
											</span>
										)}
									</div>

									{/* Isometric Blueprint Diagram */}
									<div className="my-8 flex h-44 items-center justify-center">
										<DiagramComponent className="h-36 w-36 stroke-muted-foreground transition-transform duration-500 group-hover:scale-105 group-hover:stroke-foreground" />
									</div>

									{/* Feature Content */}
									<h3 className="text-lg font-semibold text-foreground">
										{feature.title}
									</h3>
									<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
										{feature.description}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
