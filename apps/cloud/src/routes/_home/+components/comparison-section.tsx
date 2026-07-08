import { Minus } from "lucide-react";
import { SectionHeading } from "~/components/site/terminal";
import { Section } from "~/components/site/visuals";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { COMPARISON } from "../+utils/landing-content";
import { StatusCell } from "./comparison-cell";

/** "Memo FS Cloud vs DIY" — the honest comparison matrix (git/Syncthing/Dropbox). */
export function ComparisonSection() {
	return (
		<Section className="py-20">
			<SectionHeading
				eyebrow="Comparison"
				title={
					<>
						<span className="text-accent-ai font-semibold"> Memo FS </span>{" "}
						Cloud vs DIY
					</>
				}
				lede="We'll be honest. Here's when you'd use us vs. when you'd roll your own."
			/>
			<div className="mt-10 border-y border-border bg-card/10">
				<Table>
					<ComparisonHeader />
					<TableBody>
						{COMPARISON.map((row) => (
							<TableRow
								key={row.feature}
								className="border-border/40 hover:bg-white/1"
							>
								<TableCell className="pl-5 py-4 font-mono text-xs text-foreground">
									{row.feature}
								</TableCell>
								<TableCell className="py-4 text-center">
									<StatusCell cell={row.tm} highlight />
								</TableCell>
								<TableCell className="py-4 text-center">
									<StatusCell cell={row.git} />
								</TableCell>
								<TableCell className="py-4 text-center">
									<StatusCell cell={row.st} />
								</TableCell>
								<TableCell className="pr-5 py-4 text-center">
									<StatusCell cell={row.db} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
			<p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-2">
				<Minus className="size-3.5 text-muted-foreground/60" />= possible, but
				requires setup or manual steps
			</p>
		</Section>
	);
}

function ComparisonHeader() {
	return (
		<TableHeader>
			<TableRow className="border-border hover:bg-transparent">
				<TableHead className="h-12 pl-5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
					Feature
				</TableHead>
				<TableHead className="h-12 text-center font-mono text-xs text-foreground">
					Memo FS Cloud
				</TableHead>
				<TableHead className="h-12 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
					git
				</TableHead>
				<TableHead className="h-12 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
					Syncthing
				</TableHead>
				<TableHead className="h-12 pr-5 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
					Dropbox
				</TableHead>
			</TableRow>
		</TableHeader>
	);
}
