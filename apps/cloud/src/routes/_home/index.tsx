import { SectionDivider } from "~/components/site/visuals";
import { buildMeta } from "~/lib/seo";
import { BottomCta } from "./+components/bottom-cta";
import { ComparisonSection } from "./+components/comparison-section";
import { ConnectorsSection } from "./+components/connectors-section";
import { FaqSection } from "./+components/faq-section";
import { HeroSection } from "./+components/hero-section";
import { PricingSection } from "./+components/pricing-section";
import { ProblemSection } from "./+components/problem-section";
import { SecurityBlueprint } from "./+components/security-blueprint";
import { SolutionSection } from "./+components/solution-section";
import { SyncStepsSection } from "./+components/sync-steps-section";
import { UseCasesSection } from "./+components/use-cases-section";

/**
 * Home page — a composition of colocated section components. Each section's
 * markup + copy lives in its own `+components/*.tsx` file (kept under the
 * 80-line soft cap), and shared content data lives in `+utils/`. The route
 * module wires them in order with `SectionDivider` rules between them.
 *
 * HeroVideoDemo, LivePlayground, and SocialProof are deferred until launch
 * (placeholder video IDs, live API dependency, non-final testimonials).
 */

export function meta() {
	return buildMeta({
		title: "Memo FS Cloud — Local-first sync & hosted runtime",
		description:
			"Local-first memory for AI apps. Memo FS Cloud mirrors your .memofs/ files across devices and hosts a secure serverless query runtime for fast remote semantic recall.",
		path: "/",
	});
}

export default function Home() {
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
			<SecurityBlueprint />
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
