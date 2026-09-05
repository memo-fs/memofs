import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";

export function ComparisonSection() {
	const rows = [
		{
			feature: "Where memory lives",
			memofs: "Plain markdown files in your project",
			others: "Locked in a proprietary cloud database",
		},
		{
			feature: "Inspect & edit",
			others: "Vendor web UI only",
			memofs: "Any editor (VS Code, Cursor, Vim)",
		},
		{
			feature: "Version control",
			memofs: "Git-tracked alongside your codebase",
			others: "Separate external system",
		},
		{
			feature: "Data ownership",
			memofs: "100% owned and controlled by you",
			others: "Subject to vendor lock-in & terms",
		},
		{
			feature: "Offline execution",
			memofs: "Full offline support by default",
			others: "Requires persistent network connection",
		},
		{
			feature: "Protocol compatibility",
			memofs: "Native Model Context Protocol (MCP)",
			others: "Custom proprietary SDKs only",
		},
	];

	return (
		<section className="relative w-full border-t border-dashed border-border bg-background py-20 text-foreground sm:py-28 transition-colors duration-300">
			<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
				<div className="mb-14 text-center">
					<p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
						Why File-First
					</p>
					<h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						MemoFS vs. Black-Box Memory
					</h2>
					<p className="mt-4 text-base text-muted-foreground max-w-2xl mx-auto">
						Most memory tools hide your data in opaque remote dashboards. MemoFS
						keeps everything transparent, diffable, and versioned in `.memofs/`.
					</p>
				</div>

				<div className="overflow-hidden border border-dashed border-border bg-muted/70">
					<Table>
						<TableHeader>
							<TableRow className="border-b border-dashed bg-secondary font-mono text-xs uppercase tracking-wider hover:bg-secondary">
								<TableHead className="py-4">Dimension</TableHead>
								<TableHead className="py-4 text-foreground font-semibold">
									MemoFS
								</TableHead>
								<TableHead className="py-4">Hosted Memory DBs</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((row) => (
								<TableRow key={row.feature}>
									<TableCell className="py-4 font-medium">
										{row.feature}
									</TableCell>
									<TableCell className="py-4 font-semibold">
										<span className="mr-2">✓</span>
										{row.memofs}
									</TableCell>
									<TableCell className="py-4 text-muted-foreground">
										<span className="mr-2">✕</span>
										{row.others}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		</section>
	);
}
