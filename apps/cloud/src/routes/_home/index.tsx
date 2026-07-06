import { SectionDivider } from "~/components/site/visuals";
import { BottomCta } from "./+components/bottom-cta";
import { ComparisonSection } from "./+components/comparison-section";
import { ConnectorsSection } from "./+components/connectors-section";
import { FaqSection } from "./+components/faq-section";
import { HeroSection } from "./+components/hero-section";
// import { HeroVideoDemo } from "./+components/hero-video-demo";
// import { LivePlayground } from "./+components/live-playground";
import { PricingSection } from "./+components/pricing-section";
import { ProblemSection } from "./+components/problem-section";
import { SecurityBlueprint } from "./+components/security-blueprint";
// import { SocialProof } from "./+components/social-proof";
import { SolutionSection } from "./+components/solution-section";
import { SyncStepsSection } from "./+components/sync-steps-section";
import { UseCasesSection } from "./+components/use-cases-section";

/**
 * Home page — a composition of colocated section components. Each section's
 * markup + copy lives in its own `+components/*.tsx` file (kept under the 80-line
 * soft cap), and shared content data lives in `+utils/`. The route module itself
 * only wires them in order with `SectionDivider` rules between them.
 *
 * NOTE: HeroVideoDemo, LivePlayground, and SocialProof are commented out while
 * the app is in waitlist-only mode (placeholder video IDs, live API dependency,
 * and non-final testimonials respectively). Re-enable when the app launches.
 */

export function meta() {
	return [
		{ title: "Memo FS Cloud — Local-first sync & hosted runtime" },
		{
			name: "description",
			content:
				"Local-first memory for AI apps. Memo FS Cloud mirrors your .memofs/ files across devices and hosts a secure serverless query runtime for fast remote semantic recall.",
		},
	];
}

export default function Home() {
	return (
		<div>
			<HeroSection />
			{/* HeroVideoDemo — re-enable when real video is ready */}
			{/* <HeroVideoDemo /> */}
			{/* <SectionDivider /> */}
			<SectionDivider />
			<ProblemSection />
			<SectionDivider />
			<SolutionSection />
			<SectionDivider />
			{/* LivePlayground — re-enable when the hosted API is live */}
			{/* <LivePlayground /> */}
			{/* <SectionDivider /> */}
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
			{/* SocialProof — re-enable when testimonials are sourced from real users */}
			{/* <SocialProof /> */}
			{/* <SectionDivider /> */}
			<FaqSection />
			<SectionDivider />
			<BottomCta />
		</div>
	);
}
