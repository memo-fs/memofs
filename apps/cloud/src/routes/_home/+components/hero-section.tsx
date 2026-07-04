import { ArrowRight, BookOpen, Zap } from "lucide-react";
import { Link } from "react-router";
import { InlineCode } from "~/components/site/inline-code";
import { TerminalWindow } from "~/components/site/terminal";
import { Section } from "~/components/site/visuals";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { SITE_LINKS } from "~/lib/site";
import { HERO_COMMANDS } from "../+utils/landing-content";

/** Home hero — headline, lede, primary CTAs, and the terminal demo panel. */
export function HeroSection() {
	return (
		<Section className="relative overflow-hidden pt-12 pb-20 sm:py-20 animate-in fade-in-0 slide-in-from-bottom-3 duration-700">
			<div className="relative mx-auto max-w-3xl text-center">
				<Badge
					variant="outline"
					className="mb-6 border-primary/30 bg-primary/5 text-primary"
				>
					<Zap className="size-3" />
					Cloud sync is live
				</Badge>
				<h1 className="font-semibold text-balance text-5xl text-foreground md:text-6xl">
					Local-first memory. <span className="text-primary">Fully-hosted</span> runtime.
				</h1>
				<p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
					TekMemo Cloud mirrors your local <InlineCode>.tekmemo/</InlineCode> across every machine
					and hosts a secure serverless query engine. Access semantic recall, knowledge graphs,
					and notes anywhere via a fast cloud API.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
					<Button
						asChild
						size="lg"
						className="h-10 gap-2 rounded-md px-5 text-sm"
					>
						<Link to="/signup">
							Get started free
							<ArrowRight className="size-4" />
						</Link>
					</Button>
					<Button
						asChild
						size="lg"
						variant="outline"
						className="h-10 rounded-md px-5 text-sm"
					>
						<a href={SITE_LINKS.docs} rel="noreferrer" target="_blank">
							<BookOpen className="size-4" />
							View docs
						</a>
					</Button>
				</div>
			</div>
			<div className="relative mx-auto mt-14 max-w-2xl">
				<TerminalWindow commands={HERO_COMMANDS} animated />
			</div>
		</Section>
	);
}
