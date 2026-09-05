import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ROUTES, SITE } from "~/lib/site";

export function BottomCta() {
	return (
		<section className="relative w-full border-t border-dashed border-border bg-background py-20 text-foreground sm:py-28 transition-colors duration-300">
			<div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
				<Badge variant="secondary" className="border-dashed font-mono text-xs">
					MIT Licensed
				</Badge>

				<h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
					One command. Your agent never forgets.
				</h2>

				<p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
					Get started in under 2 minutes. Install the CLI or import the SDK
					directly into your TypeScript project.
				</p>

				<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
					<Button asChild size="lg">
						<Link to={ROUTES.introduction}>Get Started →</Link>
					</Button>
					<Button asChild variant="secondary" size="lg">
						<a href={SITE.githubUrl} target="_blank" rel="noopener noreferrer">
							Star on GitHub
						</a>
					</Button>
					<Button asChild variant="outline" size="lg">
						<a href={SITE.productUrl} target="_blank" rel="noopener noreferrer">
							MemoFS Cloud
						</a>
					</Button>
				</div>
			</div>
		</section>
	);
}
