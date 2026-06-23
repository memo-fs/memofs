import type { Route } from "./+types/index";

/**
 * Landing page (P0.7).
 *
 * Minimal marketing surface for TekMemo Cloud. Reflects the locked product
 * positioning (decisions.md Q4): local-first memory engine with a cloud that
 * mirrors your `.tekmemo/` files across devices. The dashboard (projects,
 * connectors, billing) layers on top of this later.
 */

const FEATURES = [
	{
		title: "One brain, every device",
		body: "Your `.tekmemo/` memory is a set of plain files. TekMemo Cloud mirrors them — byte for byte — wherever you work.",
	},
	{
		title: "The engine runs locally",
		body: "Recall, graph, and extraction execute on your machine for $0. The cloud never embeds, never indexes — it just replicates.",
	},
	{
		title: "Sync that stays out of the way",
		body: "File-based, sha256-versioned replication with automatic pre-sync snapshots. Last-writer-wins, with one-click rollback.",
	},
];

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "TekMemo Cloud — memory that follows you" },
		{
			name: "description",
			content:
				"Local-first memory for AI apps and coding agents. Sync your .tekmemo/ files across devices.",
		},
	];
}

export default function Home(_props: Route.ComponentProps) {
	return (
		<main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-16">
			<header className="flex flex-col gap-3">
				<span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
					TekMemo Cloud
				</span>
				<h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
					Memory that follows you across every device.
				</h1>
				<p className="max-w-prose text-base text-muted-foreground">
					An open-source, local-first memory engine for AI apps and coding
					agents. Sync the canonical <code>.tekmemo/</code> files to the cloud
					and keep one source of truth everywhere you work.
				</p>
				<div className="mt-2 flex flex-wrap gap-3">
					<a
						href="https://github.com/codingsimba/tekmemo"
						className="inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
					>
						Get started
					</a>
					<a
						href="/v1/health"
						className="inline-flex h-9 items-center gap-1.5 border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
					>
						API status
					</a>
				</div>
			</header>

			<section className="mt-16 grid gap-8 sm:grid-cols-3">
				{FEATURES.map((feature) => (
					<div key={feature.title} className="flex flex-col gap-2">
						<h2 className="text-sm font-semibold">{feature.title}</h2>
						<p className="text-sm text-muted-foreground">{feature.body}</p>
					</div>
				))}
			</section>

			<footer className="mt-auto pt-16 text-xs text-muted-foreground">
				<p>MIT licensed. The cloud is a file replica — the engine is yours.</p>
			</footer>
		</main>
	);
}
