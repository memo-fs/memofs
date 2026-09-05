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
			memofs: "Plain Markdown & JSONL files in .memofs/",
			others: "Locked in a proprietary cloud database",
		},
		{
			feature: "Project drift detection",
			memofs: "File hash, AST symbol & schema validation (memofs lint)",
			others: "None; stale memories reference deleted assets & data",
		},
		{
			feature: "Behavior enforcement",
			memofs: "Deterministic push hooks across 9+ AI tools & runtimes",
			others: "Passive pull tools; relies on model to remember to search",
		},
		{
			feature: "Causal lineage & audit",
			memofs: "Immutable action receipts & causal traversal (memofs why)",
			others: "Opaque similarity scores; ephemeral chat logs lost",
		},
		{
			feature: "Inspect & edit",
			memofs: "Any editor (VS Code, Cursor, Neovim, CLI)",
			others: "Vendor web dashboard or raw unindexed file",
		},
		{
			feature: "Version control",
			memofs: "Git-tracked & branchable alongside your project",
			others: "Separate external database decoupled from project history",
		},
		{
			feature: "Context efficiency",
			memofs: "Token-budgeted hybrid recall (BM25 + vector + graph)",
			others: "Monolithic prompt bloat or noisy top-k embeddings",
		},
		{
			feature: "Offline execution",
			memofs: "100% local-first; runs offline & in sandboxes",
			others: "Requires persistent network & cloud API keys",
		},
		{
			feature: "Multi-agent coordination",
			memofs: "Advisory file locks & standard stream schemas",
			others: "Unsynchronized writes or heavy external daemons",
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
						Most memory tools hide your data in opaque remote databases or rely
						on static rule files that drift and bloat prompt context. MemoFS
						combines deterministic local execution, project-anchored
						verification, and git-native transparency.
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
