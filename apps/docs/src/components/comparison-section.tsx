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
		<section className="relative w-full border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80 bg-white dark:bg-black py-20 text-zinc-900 dark:text-white sm:py-28 transition-colors duration-300">
			<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
				<div className="mb-14 text-center">
					<p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
						Why File-First
					</p>
					<h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
						MemoFS vs. Black-Box Memory
					</h2>
					<p className="mt-4 text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
						Most memory tools hide your data in opaque remote dashboards. MemoFS
						keeps everything transparent, diffable, and versioned in `.memofs/`.
					</p>
				</div>

				<div className="overflow-hidden rounded border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60">
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="border-b border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/40 text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
									<th className="py-4 px-6">Dimension</th>
									<th className="py-4 px-6 text-zinc-900 dark:text-white font-semibold">
										MemoFS
									</th>
									<th className="py-4 px-6 text-zinc-500">Hosted Memory DBs</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
								{rows.map((row) => (
									<tr
										key={row.feature}
										className="hover:bg-zinc-100/60 dark:hover:bg-zinc-900/20 transition-colors"
									>
										<td className="py-4 px-6 font-medium text-zinc-800 dark:text-zinc-300">
											{row.feature}
										</td>
										<td className="py-4 px-6 font-semibold">
											<span className="mr-2">✓</span>
											{row.memofs}
										</td>
										<td className="py-4 px-6 text-zinc-500">
											<span className="mr-2">✕</span>
											{row.others}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</section>
	);
}
