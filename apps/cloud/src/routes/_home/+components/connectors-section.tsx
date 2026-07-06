import { ArrowRight, FileText, Lock } from "lucide-react";
import {
	GithubMark,
	LinearMark,
	NotionMark,
} from "~/components/site/brand-icons";
import { InlineCode } from "~/components/site/inline-code";
import { SectionHeading } from "~/components/site/terminal";
import { Section } from "~/components/site/visuals";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { SITE_LINKS } from "~/lib/site";
import { cn } from "~/lib/utils";
import { CONNECTORS } from "../+utils/landing-content";

const ICONS = {
	github: GithubMark,
	notion: NotionMark,
	linear: LinearMark,
} as const;

/** Animating vector diagram for connectors sync */
function ConnectorDiagram() {
	return (
		<div className="relative overflow-hidden border border-border bg-premium-card h-72 w-full flex items-center justify-center bg-dot-grid rounded-none hover-glow-primary">
			{/* SVG lines */}
			<svg
				className="absolute inset-0 h-full w-full pointer-events-none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				{/* Top line to hub */}
				<path
					d="M 70,70 Q 150,70 170,110"
					stroke="oklch(0.77 0.17 70 / 0.2)"
					strokeWidth="1.5"
					fill="none"
				/>
				{/* Middle line to hub */}
				<path
					d="M 70,144 L 170,144"
					stroke="oklch(0.77 0.17 70 / 0.2)"
					strokeWidth="1.5"
					fill="none"
				/>
				{/* Bottom line to hub */}
				<path
					d="M 70,218 Q 150,218 170,178"
					stroke="oklch(0.77 0.17 70 / 0.2)"
					strokeWidth="1.5"
					fill="none"
				/>

				{/* Animated connection path from hub to local storage */}
				<path
					d="M 285,144 L 380,144"
					stroke="url(#connector-glow-grad)"
					strokeWidth="2"
					strokeDasharray="6,4"
					className="animate-sync-dash"
					fill="none"
				/>
				<defs>
					<linearGradient id="connector-glow-grad" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0%" stopColor="var(--accent-gold)" />
						<stop offset="100%" stopColor="var(--color-primary)" />
					</linearGradient>
				</defs>
			</svg>

			{/* Left Side: Three source nodes */}
			<div className="absolute left-8 flex flex-col gap-8">
				<div className="z-10 flex size-10 items-center justify-center border border-border bg-premium-card hover-glow-gold text-foreground shadow-md rounded-none transition-all duration-300">
					<GithubMark className="size-4" />
				</div>
				<div className="z-10 flex size-10 items-center justify-center border border-border bg-premium-card hover-glow-gold text-foreground shadow-md rounded-none transition-all duration-300">
					<NotionMark className="size-4" />
				</div>
				<div className="z-10 flex size-10 items-center justify-center border border-border bg-premium-card hover-glow-gold text-foreground shadow-md rounded-none opacity-40 transition-all duration-300">
					<LinearMark className="size-4" />
				</div>
			</div>

			{/* Center: Sync controller badge */}
			<div className="relative z-10 mx-6 flex items-center gap-2 border border-accent-gold/40 bg-accent-gold/5 px-4 py-2 text-[10px] text-accent-gold font-mono uppercase tracking-wider rounded-none shadow-[0_0_20px_rgba(245,158,11,0.08)]">
				<Lock className="size-3.5" />
				<span>Secure Sync</span>
				<div className="absolute inset-0 -z-10 bg-accent-gold/5 blur-sm" />
			</div>

			{/* Right Side: Local-first destination */}
			<div className="absolute right-8 flex flex-col items-center gap-1.5 z-10">
				<div className="flex size-14 items-center justify-center border border-accent-gold/30 bg-accent-gold/5 text-accent-gold shadow-lg rounded-none transition-all duration-300 hover:border-accent-gold/60">
					<FileText className="size-6" />
				</div>
				<span className="font-mono text-[9px] text-accent-gold uppercase tracking-widest bg-accent-gold/5 px-1.5 py-0.5 border border-accent-gold/20 rounded-none">
					.memofs/
				</span>
			</div>
		</div>
	);
}

/** "Ingest from where you work" — connector cards (GitHub, Notion, Linear). */
export function ConnectorsSection() {
	return (
		<Section className="py-20">
			<div className="grid items-center gap-12 lg:grid-cols-2">
				<div>
					<SectionHeading
						eyebrow="Connectors"
						title={<>Ingest from where you work</>}
						lede={
							<>
								Connectors pull from external sources — GitHub issues, Notion
								pages, Linear tickets — into your{" "}
								<InlineCode className="text-xs">.memofs/</InlineCode> on a
								schedule. Zero manual copying.
							</>
						}
					/>
					<div className="mt-6 flex flex-col gap-4">
						<div className="grid gap-3 sm:grid-cols-3">
							{CONNECTORS.map((c) => {
								const Icon = ICONS[c.icon];
								return (
									<div
										key={c.name}
										className={cn(
											"flex flex-col justify-between p-4 rounded-none bg-premium-card hover-glow-gold transition-all duration-300",
											{ "opacity-50 pointer-events-none": c.disabled },
										)}
									>
										<div className="flex items-center justify-between gap-2 mb-4">
											<div className="size-8 border border-border bg-card flex items-center justify-center rounded-none">
												<Icon className="size-3.5 text-foreground" />
											</div>
											<Badge
												variant={c.disabled ? "secondary" : "outline"}
												className="rounded-none text-[9px] py-0 px-1.5"
											>
												{c.status}
											</Badge>
										</div>
										<div>
											<p className="text-xs font-semibold text-foreground">
												{c.name}
											</p>
											<p className="text-[10px] text-muted-foreground mt-1 leading-snug">
												{c.desc}
											</p>
										</div>
									</div>
								);
							})}
						</div>

						<Button
							asChild
							size="sm"
							variant="link"
							className="self-start h-auto p-0 mt-2"
						>
							<a href={SITE_LINKS.docs} rel="noreferrer" target="_blank">
								See connector docs
								<ArrowRight className="size-3.5" />
							</a>
						</Button>
					</div>
				</div>
				<div className="w-full">
					<ConnectorDiagram />
				</div>
			</div>
		</Section>
	);
}
