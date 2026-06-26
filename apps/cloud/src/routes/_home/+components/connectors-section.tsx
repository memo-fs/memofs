import { ArrowRight } from "lucide-react";
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
								<InlineCode className="text-xs">.tekmemo/</InlineCode> on a
								schedule. Zero manual copying.
							</>
						}
					/>
					<Button asChild size="sm" variant="link" className="mt-6 h-auto p-0">
						<a href={SITE_LINKS.docs} rel="noreferrer" target="_blank">
							See connector docs
							<ArrowRight className="size-3.5" />
						</a>
					</Button>
				</div>
				<div className="grid gap-3">
					{CONNECTORS.map((c) => {
						const Icon = ICONS[c.icon];
						return (
							<div
								key={c.name}
								className={cn(
									"flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-4",
									{ "opacity-60": c.disabled },
								)}
							>
								<div className="size-9 rounded-lg border border-border bg-card/60 flex items-center justify-center shrink-0">
									<Icon className="size-4 text-foreground" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-semibold text-foreground">
										{c.name}
									</p>
									<p className="text-xs text-muted-foreground truncate">
										{c.desc}
									</p>
								</div>
								<Badge variant={c.disabled ? "secondary" : "outline"}>
									{c.status}
								</Badge>
							</div>
						);
					})}
				</div>
			</div>
		</Section>
	);
}
