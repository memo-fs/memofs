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
		<section className="relative w-full border-t border-dashed border-border bg-background py-20 text-foreground sm:py-28 transition-colors duration-300">
			<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
					<div className="lg:col-span-6">
						<p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
							The Problem
						</p>
						<h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
							Every new session{" "}
							<span className="text-muted-foreground">starts from zero.</span>
						</h2>
						<p className="mt-6 text-base leading-relaxed text-muted-foreground">
							You brief your agent on project conventions, domain rules, and
							architecture. It gets it. Next session, a blank stare. You
							re-explain everything, only for it to contradict yesterday&apos;s
							decisions.
						</p>
						<p className="mt-4 text-base leading-relaxed text-muted-foreground">
							Local scratchpads only shrink the problem. Every tool, machine,
							and collaborator ends up with fractured, uncoordinated memory.
						</p>
					</div>

					<div className="space-y-4 lg:col-span-6 flex flex-col justify-center">
						{symptoms.map((symptom) => (
							<div
								key={symptom.title}
								className="rounded-none border border-dashed border-border bg-muted p-5 transition-colors hover:border-ring"
							>
								<h3 className="text-base font-semibold text-foreground">
									{symptom.title}
								</h3>
								<p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
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
