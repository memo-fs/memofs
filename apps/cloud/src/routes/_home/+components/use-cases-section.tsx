import { ArrowRight, Boxes, Laptop, Server } from "lucide-react";
import { Link } from "react-router";
import { SectionHeading } from "~/components/site/terminal";
import { Section } from "~/components/site/visuals";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

const USE_CASES = [
	{
		icon: Laptop,
		title: "Solo developer",
		desc: "Seamless memory continuity across your laptop, desktop, and server — without thinking about it.",
	},
	{
		icon: Server,
		title: "CI/CD pipelines",
		desc: "Give your CI runner the same Memo FS context as your local machine. Pull before every run.",
	},
	{
		icon: Boxes,
		title: "Connector ingestion",
		desc: "Centralized ingestion from GitHub, Notion, and Linear — all flowing into one canonical .memofs/ replica.",
	},
];

/** "Who Memo FS Cloud is for" — three summary cards. Deep dives live on /use-cases. */
export function UseCasesSection() {
	return (
		<Section className="py-20">
			<div className="text-center mb-10">
				<SectionHeading
					align="center"
					eyebrow="Use cases"
					title={<>Who Memo FS Cloud is for</>}
				/>
			</div>
			<div className="grid gap-5 sm:grid-cols-3">
				{USE_CASES.map((uc) => (
					<Card key={uc.title} className="flex flex-col justify-between h-full">
						<CardHeader>
							<div className="mb-2 flex size-9 items-center justify-center rounded-lg border border-border bg-muted/50 text-primary">
								<uc.icon className="size-4" />
							</div>
							<CardTitle className="font-mono text-sm font-semibold text-foreground">
								{uc.title}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-xs leading-relaxed text-muted-foreground">
								{uc.desc}
							</p>
						</CardContent>
					</Card>
				))}
			</div>
			<div className="mt-8 text-center">
				<Button
					asChild
					size="sm"
					variant="outline"
					className="h-9 px-4 text-xs"
				>
					<Link to="/use-cases">
						All use cases
						<ArrowRight className="size-3.5" />
					</Link>
				</Button>
			</div>
		</Section>
	);
}
