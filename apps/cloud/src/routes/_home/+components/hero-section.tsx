import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router";
import { InlineCode } from "~/components/site/inline-code";
import { Section } from "~/components/site/visuals";
import { Button } from "~/components/ui/button";
import { SITE_LINKS } from "~/lib/site";

/** Home hero — headline, lede, primary CTAs, and the visual sync blueprint diagram. */
export function HeroSection() {
	return (
		<Section className="relative overflow-hidden flex flex-col justify-center min-h-[calc(100dvh-4rem)] pt-12 pb-16 sm:py-0 animate-in fade-in-0 slide-in-from-bottom-3 duration-700">
			{/* Grid background overlay */}
			<div className="absolute inset-0 bg-grid-pattern pointer-events-none" />

			<div className="relative mx-auto max-w-3xl text-center flex flex-col items-center">
				<div className="inline-flex items-center gap-2 px-2.5 py-1 border border-border bg-card/60 backdrop-blur-md mb-8 rounded-none">
					<span className="size-1.5 bg-accent-gold rounded-full animate-pulse shadow-[0_0_8px_1px_var(--accent-gold)]" />
					<span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
						Early access · join the waitlist
					</span>
				</div>
				<h1 className="font-medium text-balance text-4xl md:text-6xl tracking-tight text-white mb-6">
					Local-first{" "}
					<span className="text-accent-ai font-semibold font-mono">AI</span>{" "}
					memory.{" "}
					<span className="text-muted-foreground font-light">
						Cloud-hosted runtime.
					</span>
				</h1>
				<p className="mx-auto mt-2 max-w-2xl text-balance text-base md:text-lg leading-relaxed text-muted-foreground font-light">
					Memo FS Cloud mirrors your local{" "}
					<InlineCode className="text-xs">.memofs/</InlineCode> across every
					machine and runs a secure serverless query engine — giving you semantic
					recall, knowledge graphs, and note access via a fast cloud API.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
					{/* Get started — hidden while in waitlist-only mode */}
					{/* <Button
						asChild
						size="lg"
						className="h-10 gap-2 rounded-none px-6 text-sm bg-white hover:bg-gray-200 text-black font-medium border border-white hover-glow-primary transition-all duration-300"
					>
						<Link to="/signup">
							Get started free
							<ArrowRight className="size-4" />
						</Link>
					</Button> */}
					<Button
						asChild
						size="lg"
						className="h-10 gap-2 rounded-none px-6 text-sm bg-white hover:bg-gray-200 text-black font-medium border border-white hover-glow-primary transition-all duration-300"
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
						className="h-10 rounded-none px-6 text-sm bg-transparent hover:bg-white/5 text-white font-medium border-border hover-glow-primary transition-all duration-300"
					>
						<a href={SITE_LINKS.docs} rel="noreferrer" target="_blank">
							<BookOpen className="size-4" />
							View docs
						</a>
					</Button>
				</div>
			</div>
		</Section>
	);
}
