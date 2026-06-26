import { ArrowRight, Check, HelpCircle } from "lucide-react";
import { Link } from "react-router";
import { Section } from "~/components/site/visuals";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/pricing";
import type { Plan } from "./+utils/plans";
import { PLANS } from "./+utils/plans";

/**
 * Pricing page (SC2.1). Renders the full feature matrix — the single source of
 * truth lives in `+utils/plans.ts`, shared with the landing pricing section.
 */

const FAQS = [
	{
		q: "What counts as a connector?",
		a: "Each configured data source counts as one connector — e.g. one GitHub org, one Notion workspace. Multiple repos inside the same org connector count as one.",
	},
	{
		q: "How is storage measured?",
		a: "Total compressed size of all blobs in storage for your account, including pre-sync snapshots. Deleted projects are purged within 24 hours.",
	},
	{
		q: "Can I switch plans at any time?",
		a: "Yes. Upgrades take effect immediately and are pro-rated. Downgrades take effect at the end of the current billing period.",
	},
	{
		q: "Who handles billing?",
		a: "Polar acts as our Merchant of Record and handles checkout, taxes, invoices, and cancellation. You'll see 'Polar · TekMemo' on your statement.",
	},
	{
		q: "Is there an annual discount?",
		a: "Not yet, but we're planning to introduce one. Join the mailing list (above) and we'll notify you.",
	},
];

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Pricing — TekMemo Cloud" },
		{
			name: "description",
			content:
				"Simple, transparent pricing. Pay for storage and the features you use. Billed through Polar.",
		},
	];
}

export default function Pricing(_props: Route.ComponentProps) {
	return (
		<Section className="py-20">
			<PricingHeader />
			<div className="relative mt-14 grid gap-6 lg:grid-cols-3">
				{PLANS.map((plan) => (
					<PlanCard key={plan.name} plan={plan} />
				))}
			</div>
			<TeamsNotify />
			<PricingFaq />
		</Section>
	);
}

function PricingHeader() {
	return (
		<header className="relative flex flex-col gap-4 text-center">
			<div className="mx-auto flex items-center gap-2.5">
				<span
					aria-hidden
					className="size-1.5 rounded-full bg-primary animate-pulse"
				/>
				<span className="font-heading text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">
					Pricing
				</span>
			</div>
			<h1 className="font-heading font-bold tracking-[-0.03em] leading-[1.02] mx-auto max-w-2xl text-balance text-4xl text-foreground sm:text-5xl">
				Simple, transparent pricing
			</h1>
			<p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground">
				Pay for storage and the features you use. The Teams tier is billed per
				active seat.
			</p>
		</header>
	);
}

function PlanCard({ plan }: { plan: Plan }) {
	return (
		<Card
			className={cn({
				"border border-primary/40 lg:-mt-4 lg:mb-4 bg-muted/10": plan.highlight,
				"opacity-80": plan.soon,
			})}
		>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="font-mono text-lg font-semibold text-foreground">
						{plan.name}
					</CardTitle>
					{plan.highlight && (
						<Badge className="bg-primary text-primary-foreground hover:bg-primary text-xs">
							Popular
						</Badge>
					)}
					{plan.soon && (
						<Badge variant="secondary" className="text-xs">
							Coming soon
						</Badge>
					)}
				</div>
				<div className="mt-4 flex items-baseline gap-1">
					<span className="font-heading font-bold tracking-[-0.03em] leading-[1.02] text-5xl text-foreground">
						{plan.price}
					</span>
					<span className="text-sm text-muted-foreground">{plan.period}</span>
				</div>
				<CardDescription className="text-xs mt-2">{plan.desc}</CardDescription>
			</CardHeader>
			<CardContent className="border-t border-border/40 pt-6">
				<ul className="space-y-2.5">
					{plan.features.map((f) => (
						<li
							key={f.text}
							className={cn("flex items-center gap-2.5 text-sm", {
								"text-muted-foreground/50 line-through": !f.included,
							})}
						>
							{f.included ? (
								<Check className="w-4 h-4 text-primary shrink-0" />
							) : (
								<span className="w-4 h-4 shrink-0 text-center text-muted-foreground/30">
									—
								</span>
							)}
							<span className="text-muted-foreground">{f.text}</span>
						</li>
					))}
				</ul>
			</CardContent>
			<CardFooter className="pt-6">
				<PlanCardCta plan={plan} />
			</CardFooter>
		</Card>
	);
}

function PlanCardCta({ plan }: { plan: Plan }) {
	if (plan.soon) {
		return (
			<Button variant="outline" className="w-full" disabled>
				{plan.cta.label}
			</Button>
		);
	}
	return (
		<Button
			asChild
			className="w-full gap-1.5"
			variant={plan.highlight ? "default" : "outline"}
		>
			<Link to={plan.cta.href}>
				{plan.cta.label}
				<ArrowRight className="size-4" />
			</Link>
		</Button>
	);
}

function TeamsNotify() {
	// Derive the Teams price/period from the SSOT so this card can't drift.
	const teams = PLANS.find((p) => p.name === "Teams");
	return (
		<div id="teams-notify" className="relative mt-20 max-w-lg mx-auto">
			<Card className="bg-muted/20">
				<CardHeader className="text-center">
					<CardTitle className="text-lg">
						Get notified when Teams launches
					</CardTitle>
					<CardDescription className="text-sm">
						Teams is coming. Leave your email and we'll notify you when it goes
						live — list price locked at{" "}
						{teams ? `${teams.price}${teams.period}` : "$24/seat/mo"}.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex gap-2">
					<Input
						type="email"
						placeholder="you@example.com"
						className="bg-background"
					/>
					<Button className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/95">
						Notify me
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function PricingFaq() {
	return (
		<div className="max-w-2xl mx-auto mt-20">
			<h2 className="text-center mb-8 font-heading tracking-[-0.03em] leading-[1.02] text-2xl font-bold">
				Pricing FAQ
			</h2>
			<div className="space-y-3">
				{FAQS.map((item) => (
					<Card key={item.q}>
						<CardContent className="flex items-start gap-3 pt-6">
							<HelpCircle className="w-4 h-4 text-primary/80 mt-0.5 shrink-0" />
							<div>
								<h4 className="font-semibold text-sm mb-1 text-foreground">
									{item.q}
								</h4>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{item.a}
								</p>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
