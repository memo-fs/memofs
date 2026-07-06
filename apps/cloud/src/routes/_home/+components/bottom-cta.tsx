import { ArrowRight, Check, GitBranch, RefreshCw, Shield } from "lucide-react";
import { Link } from "react-router";
import { InlineCode } from "~/components/site/inline-code";
import { Section } from "~/components/site/visuals";
import { Button } from "~/components/ui/button";
import { SITE_LINKS } from "~/lib/site";

const TRUST = [
	{ icon: Check, label: "Early access perks" },
	{ icon: Shield, label: "Open-source engine" },
	{ icon: RefreshCw, label: "Cancel anytime" },
	{ icon: GitBranch, label: "Local-first by design" },
];

/** Final conversion section — the glass CTA card plus trust badges. */
export function BottomCta() {
	return (
		<Section className="py-24">
			<div className="relative overflow-hidden border border-border bg-card/40 px-6 py-16 text-center">
				<div className="relative">
					<div className="w-12 h-12 bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-6">
						<GitBranch className="w-6 h-6 text-primary" />
					</div>
					<h2 className="font-heading font-bold tracking-[-0.03em] leading-[1.02] mx-auto max-w-xl text-balance text-3xl text-foreground sm:text-4xl">
						Be first to sync.
					</h2>
					<p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
						Early access, open-source at the core. Reserve your spot and get
						your{" "}
						<InlineCode className="text-xs">.memofs/</InlineCode> synced the
						day we launch.
					</p>
					<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
						{/* Get started — hidden while in waitlist-only mode */}
						{/* <Button asChild size="lg" className="h-10 gap-2 rounded-none px-6 text-sm">
							<Link to="/signup">
								Get started free
								<ArrowRight className="size-4" />
							</Link>
						</Button> */}
						<Button
							asChild
							size="lg"
							className="h-10 gap-2 rounded-none px-6 text-sm"
						>
							<Link to="/waitlist">
								Join the waitlist
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button
							asChild
							size="lg"
							variant="outline"
							className="h-10 rounded-none px-5 text-sm"
						>
							<a href={SITE_LINKS.docs} rel="noreferrer" target="_blank">
								Read the docs
							</a>
						</Button>
					</div>
					<div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
						{TRUST.map((t) => (
							<span key={t.label} className="flex items-center gap-1.5">
								<t.icon className="size-3.5 text-primary" />
								{t.label}
							</span>
						))}
					</div>
				</div>
			</div>
		</Section>
	);
}
