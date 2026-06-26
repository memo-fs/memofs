import { Check, Cloud } from "lucide-react";
import { InlineCode } from "~/components/site/inline-code";
import { SectionHeading } from "~/components/site/terminal";
import { Section } from "~/components/site/visuals";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { CLOUD_FILES, SOLUTION_BULLETS } from "../+utils/landing-content";

/** The "one source of truth" solution section with the cloud-replica card. */
export function SolutionSection() {
	return (
		<Section className="py-20">
			<div className="grid gap-12 lg:grid-cols-2 items-center">
				<div>
					<SectionHeading
						eyebrow="The solution"
						title={<>One source of truth. Zero overhead.</>}
						lede={
							<>
								TekMemo Cloud mirrors your{" "}
								<InlineCode className="text-xs">.tekmemo/</InlineCode> files
								byte-for-byte. The TekMemo engine runs entirely on your machine
								— the cloud is a quiet file replica, not a processor.
							</>
						}
					/>
					<ul className="mt-6 space-y-3">
						{SOLUTION_BULLETS.map((item) => (
							<li key={item} className="flex items-start gap-2.5 text-sm">
								<Check className="mt-0.5 size-4 shrink-0 text-primary" />
								<span className="text-muted-foreground">{item}</span>
							</li>
						))}
					</ul>
				</div>
				<Card>
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
								<Cloud className="w-4 h-4 text-primary" />
							</div>
							<div>
								<CardTitle className="font-semibold text-sm text-foreground">
									TekMemo Cloud
								</CardTitle>
								<CardDescription className="text-xs text-muted-foreground">
									File replica · not a processor
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{CLOUD_FILES.map((f) => (
								<div
									key={f.label}
									className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 text-sm"
								>
									<span className="font-mono text-xs text-muted-foreground truncate">
										{f.label}
									</span>
									<div className="flex items-center gap-3 shrink-0 ml-2">
										<span className="text-xs text-muted-foreground font-mono">
											{f.size}
										</span>
										<Check className="size-3.5 text-primary" />
									</div>
								</div>
							))}
						</div>
						<p className="text-xs text-muted-foreground font-mono mt-4">
							247 files · 2.4 MB · cursor cur_xyz789
						</p>
					</CardContent>
				</Card>
			</div>
		</Section>
	);
}
