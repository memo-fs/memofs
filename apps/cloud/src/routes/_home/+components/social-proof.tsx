import { GitBranch, Scale, Star, Users } from "lucide-react";
import { SectionHeading } from "~/components/site/terminal";
import { Section } from "~/components/site/visuals";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { GITHUB_STATS, TESTIMONIALS } from "../+utils/landing-content";

/**
 * SocialProof — displays key community metrics (GitHub stars, contributors)
 * and developer testimonials/quotes.
 */
export function SocialProof() {
	return (
		<Section className="py-20">
			<SectionHeading
				eyebrow="Community & Trust"
				title={<>Loved by developers & built in the open</>}
				lede="Memo FS is fully open-source. Join our community of developers building local-first, contextual AI applications."
			/>

			{/* GitHub Stats Grid */}
			<div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 mb-12">
				<div className="border border-border bg-card/10 p-5 text-center flex flex-col justify-center items-center rounded-none">
					<Star className="size-5 text-primary mb-2" />
					<div className="text-xl font-bold font-mono text-foreground">
						{GITHUB_STATS.stars}
					</div>
					<div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
						GitHub Stars
					</div>
				</div>
				<div className="border border-border bg-card/10 p-5 text-center flex flex-col justify-center items-center rounded-none">
					<Users className="size-5 text-primary mb-2" />
					<div className="text-xl font-bold font-mono text-foreground">
						{GITHUB_STATS.contributors}
					</div>
					<div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
						Contributors
					</div>
				</div>
				<div className="border border-border bg-card/10 p-5 text-center flex flex-col justify-center items-center rounded-none">
					<GitBranch className="size-5 text-primary mb-2" />
					<div className="text-xl font-bold font-mono text-foreground">
						{GITHUB_STATS.releases}
					</div>
					<div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
						Releases
					</div>
				</div>
				<div className="border border-border bg-card/10 p-5 text-center flex flex-col justify-center items-center rounded-none">
					<Scale className="size-5 text-primary mb-2" />
					<div className="text-xl font-bold font-mono text-foreground">
						{GITHUB_STATS.license}
					</div>
					<div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
						License
					</div>
				</div>
			</div>

			{/* Testimonials Wall */}
			<div className="grid gap-4 sm:grid-cols-3">
				{TESTIMONIALS.map((t) => (
					<Card
						key={t.name}
						className="border border-border bg-card/20 rounded-none flex flex-col justify-between"
					>
						<CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
							<div className="flex size-9 items-center justify-center border border-primary/20 bg-primary/5 text-primary font-mono text-xs font-semibold rounded-none">
								{t.avatar}
							</div>
							<div>
								<div className="text-xs font-semibold text-foreground">
									{t.name}
								</div>
								<div className="text-[10px] text-muted-foreground mt-0.5">
									{t.role}
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-xs italic leading-relaxed text-muted-foreground">
								&ldquo;{t.text}&rdquo;
							</p>
						</CardContent>
					</Card>
				))}
			</div>
		</Section>
	);
}
