import { ArrowRight, Check, Cpu, RefreshCw, Users } from "lucide-react";
import { Link } from "react-router";
import { GithubMark } from "~/components/site/brand-icons";
import { Section } from "~/components/site/visuals";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { buildMeta } from "~/lib/seo";
import type { Route } from "./+types/use-cases";

/**
 * Use-cases page (SC2).
 *
 * Concrete "what Memo FS Cloud is for." Four honest v1 use cases (multi-device
 * sync, hosted query runtime, connector ingestion, team memory) grounded in the
 * product reality.
 */

const USE_CASES = [
	{
		n: "01",
		icon: RefreshCw,
		title: "Multi-device sync",
		tagline: "One source of truth, everywhere you work.",
		body: "Edit your memory on a laptop, pull it on a workstation, push from CI. Memo FS Cloud mirrors the canonical .memofs/ files byte-for-byte with automatic pre-sync snapshots and one-click rollback. No merge conflicts, no silent overwrites.",
		bullets: [
			"Laptop → workstation → CI, all reading the same files",
			"Automatic snapshots before every push",
			"Roll back to any prior state in one click",
		],
	},
	{
		n: "02",
		icon: Cpu,
		title: "Hosted query runtime",
		tagline: "Access your knowledge graph remotely via API.",
		body: "Query your memory from anywhere without needing local files. Our secure, serverless runtime calculates embeddings, runs semantic search, and processes context on the fly over HTTP via your test or production API keys.",
		bullets: [
			"Fast, serverless semantic query execution over HTTP",
			"Automated knowledge graph extraction and vector embedding",
			"Secure API key authorization for remote app integrations",
		],
	},
	{
		n: "03",
		icon: GithubMark,
		title: "Connector ingestion",
		tagline: "Feed your memory from the tools you already use.",
		body: "Connectors pull from external sources — GitHub issues, Notion docs — into your .memofs/ as notes. Tokens stay on your machine and never touch your synced files. GitHub and Notion are available today; Linear is on the way.",
		bullets: [
			"GitHub and Notion available today, Linear coming soon",
			"Tokens never touch your synced files",
			"Ingestion runs locally — your machine does the work",
		],
	},
	{
		n: "04",
		icon: Users,
		title: "Team memory",
		tagline: "Shared workspaces — coming with Teams.",
		body: "A shared .memofs/ that a whole team reads and writes. Per-seat billing, shared workspace, and unlimited connectors — part of the Teams tier at $24/seat/mo. We're gathering demand now and opening it up as the tier launches.",
		bullets: [
			"$24/seat/mo — list price locked",
			"Shared workspace with unlimited connectors",
			"Join the waitlist to shape what we ship first",
		],
	},
] as const;

export function meta(_: Route.MetaArgs) {
	return buildMeta({
		title: "Use cases — Memo FS Cloud",
		description:
			"Multi-device sync, hosted serverless query runtime, connector ingestion, and team collaboration. Discover the core capabilities of Memo FS Cloud.",
		path: "/use-cases",
	});
}

export default function UseCases(_props: Route.ComponentProps) {
	return (
		<Section className="py-20">
			<header className="relative flex flex-col gap-4">
				<div className="flex items-center gap-2.5">
					<span
						aria-hidden
						className="size-1.5 rounded-full bg-primary animate-pulse"
					/>
					<span className="font-heading text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">
						Use cases
					</span>
				</div>
				<h1 className="font-heading font-bold tracking-[-0.03em] leading-[1.02] max-w-2xl text-balance text-4xl text-foreground sm:text-5xl">
					What Memo FS Cloud is <span className="text-primary">for</span>.
				</h1>
				<p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
					Memo FS Cloud mirrors your{" "}
					<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
						.memofs/
					</code>{" "}
					across devices and hosts a secure serverless query runtime for remote
					recall. Here is what you can build with it today.
				</p>
			</header>

			<div className="relative mt-12 flex flex-col gap-4">
				{USE_CASES.map((uc) => (
					<Card key={uc.title}>
						<CardContent className="p-8">
							<div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
								<div>
									<div className="flex items-center gap-3">
										<span className="font-heading font-bold tracking-[-0.03em] leading-[1.02] text-4xl text-muted-foreground/40">
											{uc.n}
										</span>
										<span className="flex size-9 items-center justify-center rounded-lg border border-border bg-primary/10 text-primary">
											<uc.icon className="size-4" />
										</span>
									</div>
									<h2 className="mt-4 font-mono text-xl font-semibold text-foreground">
										{uc.title}
									</h2>
									<p className="mt-1 text-sm font-medium text-primary">
										{uc.tagline}
									</p>
								</div>
								<div>
									<p className="text-sm leading-relaxed text-muted-foreground">
										{uc.body}
									</p>
									<ul className="mt-5 flex flex-col gap-2.5">
										{uc.bullets.map((b) => (
											<li key={b} className="flex items-start gap-2.5 text-sm">
												<Check className="mt-0.5 size-4 shrink-0 text-primary" />
												<span className="text-foreground">{b}</span>
											</li>
										))}
									</ul>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="relative mt-16 overflow-hidden rounded-2xl border border-border bg-card/40 px-6 py-12 text-center glass">
				<h2 className="font-heading font-bold tracking-[-0.03em] leading-[1.02] relative text-balance text-2xl text-foreground sm:text-3xl">
					Be first to sync your memory.
				</h2>
				{/* Get started — hidden while in waitlist-only mode */}
				{/* <Button asChild size="lg" className="relative mt-6 h-10 gap-2 rounded-md px-6 text-sm">
					<Link to="/signup">
						Get started free
						<ArrowRight className="size-4" />
					</Link>
				</Button> */}
				<Button
					asChild
					size="lg"
					className="relative mt-6 h-10 gap-2 rounded-none px-6 text-sm"
				>
					<Link to="/waitlist">
						Join the waitlist
						<ArrowRight className="size-4" />
					</Link>
				</Button>
			</div>
		</Section>
	);
}
