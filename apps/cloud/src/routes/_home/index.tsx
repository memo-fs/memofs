import { SectionDivider } from "~/components/site/visuals";
import { BottomCta } from "./+components/bottom-cta";
import { ComparisonSection } from "./+components/comparison-section";
import { ConnectorsSection } from "./+components/connectors-section";
import { FaqSection } from "./+components/faq-section";
import { HeroSection } from "./+components/hero-section";
import { PricingSection } from "./+components/pricing-section";
import { ProblemSection } from "./+components/problem-section";
import { SolutionSection } from "./+components/solution-section";
import { SyncStepsSection } from "./+components/sync-steps-section";
import { UseCasesSection } from "./+components/use-cases-section";
import type { Route } from "./+types/index";

/**
 * Home page — a composition of colocated section components. Each section's
 * markup + copy lives in its own `+components/*.tsx` file (kept under the 80-line
 * soft cap), and shared content data lives in `+utils/`. The route module itself
 * only wires them in order with `SectionDivider` rules between them.
 */

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "TekMemo Cloud — Local-first sync & hosted runtime" },
		{
			name: "description",
			content:
				"Local-first memory for AI apps. TekMemo Cloud mirrors your .tekmemo/ files across devices and hosts a secure serverless query runtime for fast remote semantic recall.",
		},
	];
}

export default function Home(_props: Route.ComponentProps) {
	return (
		<div>
			<HeroSection />
			<SectionDivider />
			<ProblemSection />
			<SectionDivider />
			<SolutionSection />
			<SectionDivider />
			<SyncStepsSection />
			<SectionDivider />
			<ConnectorsSection />
			<SectionDivider />
			<PricingSection />
			<SectionDivider />
			<UseCasesSection />
			<SectionDivider />
			<ComparisonSection />
			<SectionDivider />
			<FaqSection />
			<SectionDivider />
			<BottomCta />
		</div>
	);
}
