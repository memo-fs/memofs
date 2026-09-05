export function ProblemSection() {
	const symptoms = [
		{
			title: "Silent Project Drift.",
			desc: "When project files, schemas, docs, or code change, unanchored memories reference deleted assets and obsolete facts, turning into toxic ghost context that actively steers AI into hallucinations.",
		},
		{
			title: "The Black-Box Silo.",
			desc: "Proprietary vector databases lock learned knowledge behind opaque APIs. You can't inspect what the AI learned, edit it in your local editor, or review it in a git diff alongside your project.",
		},
		{
			title: "The Prompt-Bloat Dilemma.",
			desc: "Static rulebooks (like 50KB instruction files) burn thousands of prompt tokens on every turn, while AI models forget to query dynamic memory unless the runtime deterministically pushes it.",
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
							AI Agents memory is broken{" "}
							<span className="text-muted-foreground">in two directions.</span>
						</h2>
						<p className="mt-6 text-base leading-relaxed text-muted-foreground">
							On one side, static markdown rulebooks like{" "}
							<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
								AGENTS.md
							</code>
							,{" "}
							<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
								CLAUDE.md
							</code>{" "}
							and{" "}
							<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
								.cursor/rules
							</code>{" "}
							bloat context windows with massive token dumps that silently drift
							the moment project files, docs, data schemas, or implementations
							change.
						</p>
						<p className="mt-4 text-base leading-relaxed text-muted-foreground">
							On the other side, hosted vector databases lock learned facts
							inside proprietary black boxes, invisible, impossible to review in
							a git diff, disconnected from your project, and trapped in someone
							else&apos;s cloud.
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
