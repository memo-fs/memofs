import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router";
import { SectionHeading } from "~/components/site/terminal";
import { Section } from "~/components/site/visuals";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { PLANS } from "../+utils/plans";

/**
 * Landing pricing section. Shows only the *included* features per plan (the
 * compact view) — the full feature matrix lives on the dedicated /pricing page.
 * Plan data is the single source of truth in `+utils/plans.ts`.
 */
export function PricingSection() {
	return (
		<Section className="py-20">
			<SectionHeading
				align="center"
				eyebrow="Pricing"
				title={<>Start free. Upgrade when you need more.</>}
				lede="Simple, transparent pricing with no seat surprises."
			/>
			<div className="mt-10 grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
				{PLANS.map((plan) => {
					const included = plan.features.filter((f) => f.included);
					return (
						<Card
							key={plan.name}
							className={cn(
								"flex flex-col justify-between h-full",
								plan.highlight
									? "border border-primary/40 lg:-mt-2 lg:mb-2"
									: "",
								plan.soon ? "opacity-70" : "",
							)}
						>
							<div>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle className="font-mono text-sm font-semibold text-foreground">
											{plan.name}
										</CardTitle>
										{plan.highlight ? (
											<Badge variant="default" className="h-6">
												Popular
											</Badge>
										) : null}
										{plan.soon ? (
											<Badge variant="secondary" className="h-6">
												Soon
											</Badge>
										) : null}
									</div>
									<div className="mt-4 flex items-baseline gap-1">
										<span className="font-heading font-bold tracking-[-0.03em] leading-[1.02] text-4xl text-foreground">
											{plan.price}
										</span>
										<span className="text-sm text-muted-foreground">
											{plan.period}
										</span>
									</div>
								</CardHeader>
								<CardContent className="border-t border-border/40 pt-4">
									<ul className="space-y-2">
										{included.map((f) => (
											<li
												key={f.text}
												className="flex items-center gap-2 text-xs text-muted-foreground"
											>
												<Check className="size-3.5 text-primary shrink-0" />
												{f.text}
											</li>
										))}
									</ul>
								</CardContent>
							</div>
							<CardFooter className="pt-4">
								<PlanCta plan={plan} />
							</CardFooter>
						</Card>
					);
				})}
			</div>
			<div className="mt-8 text-center">
				<Button
					asChild
					size="sm"
					variant="outline"
					className="h-9 px-4 text-xs"
				>
					<Link to="/pricing">
						Full pricing details
						<ArrowRight className="size-3.5" />
					</Link>
				</Button>
			</div>
		</Section>
	);
}

function PlanCta({ plan }: { plan: (typeof PLANS)[number] }) {
	if (plan.soon) {
		return (
			<Button variant="outline" className="w-full text-xs h-9" disabled>
				{plan.cta.label}
			</Button>
		);
	}
	return (
		<Button
			asChild
			className="w-full text-xs h-9 gap-1.5"
			variant={plan.highlight ? "default" : "outline"}
		>
			<Link to={plan.cta.href}>
				{plan.cta.label}
				<ArrowRight className="size-3.5" />
			</Link>
		</Button>
	);
}
