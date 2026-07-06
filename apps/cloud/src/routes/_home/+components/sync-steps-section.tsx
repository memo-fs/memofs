import { Terminal } from "lucide-react";
import { SectionHeading } from "~/components/site/terminal";
import { Section } from "~/components/site/visuals";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { SYNC_STEPS } from "../+utils/landing-content";

/** "Three commands. That's it." — the init/push/pull protocol cards. */
export function SyncStepsSection() {
	return (
		<Section className="py-20">
			<SectionHeading
				eyebrow="How sync works"
				title={<>Three commands. That's it.</>}
				lede={
					<>
						Init once, push when you change something, pull on any other
						machine. The cursor tracks exactly where each machine is.
					</>
				}
			/>
			<div className="mt-12 grid gap-4 sm:grid-cols-3">
				{SYNC_STEPS.map((item) => (
					<Card
						key={item.step}
						className="flex flex-col justify-between min-h-full rounded-none border border-border bg-card/40 transition-colors hover:border-primary/30"
					>
						<div>
							<CardHeader>
								<div className="flex items-center justify-between">
									<span className="text-xs font-mono text-muted-foreground">
										{item.step}
									</span>
									<Terminal className="w-4 h-4 text-primary" />
								</div>
								<code className="font-mono text-xs bg-muted px-2 py-1 rounded-none block mt-2 text-primary border border-border/30">
									{item.cmd}
								</code>
							</CardHeader>
							<CardContent>
								<CardTitle className="font-semibold text-sm text-foreground mb-2">
									{item.title}
								</CardTitle>
								<p className="text-xs leading-relaxed text-muted-foreground">
									{item.desc}
								</p>
							</CardContent>
						</div>
					</Card>
				))}
			</div>
		</Section>
	);
}
