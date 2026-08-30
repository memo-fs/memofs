export function ProblemSection() {
	const symptoms = [
		{
			title: "Divergent.",
			desc: "Your desktop, remote containers, and teammates' agents each remember conflicting, fragmented context.",
		},
		{
			title: "Invisible.",
			desc: "Black-box vector databases hide what agents have learned, preventing inspection, verification, or manual correction.",
		},
		{
			title: "Unreachable.",
			desc: "Serverless functions, CI/CD runners, and hosted workflows start from scratch on every invocation with zero ground truth.",
		},
	];

	return (
		<section className="relative w-full border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80 bg-white dark:bg-black py-20 text-zinc-900 dark:text-white sm:py-28 transition-colors duration-300">
			<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
					<div className="lg:col-span-6">
						<p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
							The Problem
						</p>
						<h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
							Every new session{" "}
							<span className="bg-linear-to-r from-cyan-500 to-amber-500 dark:from-cyan-400 dark:to-amber-300 bg-clip-text text-transparent">
								starts from zero.
							</span>
						</h2>
						<p className="mt-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
							You brief your agent on project conventions, domain rules, and
							architecture. It gets it. Next session — a blank stare. You
							re-explain everything, only for it to contradict yesterday&apos;s
							decisions.
						</p>
						<p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
							Local scratchpads only shrink the problem. Every tool, machine,
							and collaborator ends up with fractured, uncoordinated memory.
						</p>
					</div>

					<div className="space-y-4 lg:col-span-6 flex flex-col justify-center">
						{symptoms.map((symptom) => (
							<div
								key={symptom.title}
								className="rounded-none border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-5 transition-colors hover:border-zinc-400 dark:hover:border-zinc-700"
							>
								<h3 className="text-base font-semibold text-zinc-900 dark:text-white">
									{symptom.title}
								</h3>
								<p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
									{symptom.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
