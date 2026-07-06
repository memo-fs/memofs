import { AlertTriangle, Laptop, Server, Users } from "lucide-react";
import { InlineCode } from "~/components/site/inline-code";
import { SectionHeading } from "~/components/site/terminal";
import { Section } from "~/components/site/visuals";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

type Device = {
	icon: typeof Laptop;
	tone: string;
	title: string;
	desc: string;
};

const DEVICES: Device[] = [
	{
		icon: Laptop,
		tone: "text-primary",
		title: "Your laptop",
		desc: "247 files, last edit 5 minutes ago. Has the connector config you just updated.",
	},
	{
		icon: Server,
		tone: "text-orange-500",
		title: "CI server",
		desc: "83 files. A stale snapshot from last month. Connector config doesn't match.",
	},
	{
		icon: Users,
		tone: "text-red-500",
		title: "Coworker's laptop",
		desc: "189 files. Your teammate pulled 3 weeks ago — their memory has already diverged from yours.",
	},
];

/** The "memory drift" problem section. Orange/red are semantic warnings here. */
export function ProblemSection() {
	return (
		<Section className="py-20">
			<SectionHeading
				eyebrow="The problem"
				title={<>Multi-device memory drift is real</>}
				lede={
					<>
						You edit <InlineCode className="text-xs">.memofs/</InlineCode> on
						your laptop. CI pushes a run log on the server. A teammate is still
						on last week's snapshot. They've silently diverged.
					</>
				}
			/>
			<div className="mt-12 grid gap-4 sm:grid-cols-3">
				{DEVICES.map((d) => (
					<Card key={d.title} className="flex flex-col justify-between h-full">
						<CardHeader>
							<div
								className={cn(
									"mb-3 flex size-9 items-center justify-center rounded-lg border border-border bg-muted/50",
									d.tone,
								)}
							>
								<d.icon className="size-5" />
							</div>
							<CardTitle className="font-mono text-sm font-semibold text-foreground">
								{d.title}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-xs leading-relaxed text-muted-foreground">
								{d.desc}
							</p>
						</CardContent>
					</Card>
				))}
			</div>
			<Alert className="mt-8 border-orange-500/20 bg-orange-500/5 text-orange-400">
				<AlertTriangle className="size-4 shrink-0 text-orange-400" />
				<AlertDescription className="text-orange-300">
					Git is manual and commits feel heavy for memory files. Syncthing needs
					a running device. Dropbox has silent conflicts and leaks your data to
					a third party.
				</AlertDescription>
			</Alert>
		</Section>
	);
}
