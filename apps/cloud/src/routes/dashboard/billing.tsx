import { env } from "cloudflare:workers";
import { ArrowUpRight, Check, ExternalLink } from "lucide-react";
import { getDB } from "~/.server/db";
import type { AccountView } from "~/.server/queries";
import { getAccountUsage } from "~/.server/queries";
import { requireUserWithAccount } from "~/.server/session";
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
import { Progress } from "~/components/ui/progress";
import { PLAN_ENTITLEMENTS } from "~/lib/entitlements";
import { SITE_LINKS } from "~/lib/site";
import { cn } from "~/lib/utils";
import { formatBytes } from "~/utils/misc";
import { PLANS } from "../_home/+utils/plans";
import { PageHeader } from "./+components/page-header";
import type { Route } from "./+types/billing";
import { buildNoindexMeta } from "~/lib/seo";

/**
 * Billing (SC3.5 / SC9). Account-wide: plan + the 4-dimension entitlement
 * snapshot from the real DB; checkout/portal handled by Polar (Merchant of
 * Record, ADR 0006) — we link out, we don't build a billing engine. The plan
 * picker's "Current" badge is driven by the account's real `plan` enum, matched
 * case-insensitively against the `PLANS` catalog (catalog names are
 * display-cased, the enum is lowercase).
 *
 * All four entitlement caps derive from `PLAN_ENTITLEMENTS` keyed by the
 * account's plan — the single source of truth the data path
 * (`provision-account`, the Polar webhook) and this view both read, so a cap
 * change is one edit and marketing copy can never drift from the enforced limit
 * (AGENTS.md DRY/SSOT; ADR 0006 §12.3).
 */

export function meta() {
	return buildNoindexMeta("Billing — Memo FS Cloud");
}

/** Server data: the entitlement snapshot + account-wide usage + Polar config. */
export interface BillingLoaderData {
	account: AccountView | null;
	usage: {
		storageBytes: number;
		connectorsUsed: number;
		consolidationUsedToday: number;
		preWarmUsedToday: number;
	};
	/** Polar product IDs for billable tiers (env-configured). */
	proProductId?: string;
	teamsProductId?: string;
}

export async function loader({
	request,
}: Route.LoaderArgs): Promise<BillingLoaderData> {
	const { account } = await requireUserWithAccount(request);
	const usage = account
		? await getAccountUsage(account.id)
		: {
				storageBytes: 0,
				connectorsUsed: 0,
				consolidationUsedToday: 0,
				preWarmUsedToday: 0,
			};
	return {
		account,
		usage,
		proProductId: env.POLAR_PRO_PRODUCT_ID,
		teamsProductId: env.POLAR_TEAMS_PRODUCT_ID,
	};
}

export default function BillingPage({ loaderData }: Route.ComponentProps) {
	const { account, usage, proProductId, teamsProductId } = loaderData;

	const plan = account?.plan ?? "free";
	const accountId = account?.id;
	// The 4-dimension entitlement snapshot — all sourced from the SSOT keyed by
	// the account's plan (ADR 0006 §12.3 numeric caps, never plan-name checks).
	// `normalizeCaps` rehydrates the unlimited sentinel → Infinity for display.
	const caps = PLAN_ENTITLEMENTS[plan];
	const maxStorage =
		account?.maxHostedStorageBytes ?? caps.maxHostedStorageBytes;
	const maxConnectors = account?.maxConnectors ?? caps.maxConnectors;
	const maxConsolidation = caps.maxConsolidationRuns;
	const maxPreWarm = caps.maxPreWarmPerDay;

	const storagePercent =
		maxStorage > 0 ? (usage.storageBytes / maxStorage) * 100 : 0;
	const connectorsPercent =
		maxConnectors > 0 ? (usage.connectorsUsed / maxConnectors) * 100 : 0;
	// Intelligence dimensions are metered per UTC day (Q19). Both counts come
	// from `getAccountUsage`, which aggregates `memory_events` since UTC midnight.
	const consolidationUsed = usage.consolidationUsedToday;
	const preWarmUsed = usage.preWarmUsedToday;
	const consolidationPercent = capPercent(consolidationUsed, maxConsolidation);
	const preWarmPercent = capPercent(preWarmUsed, maxPreWarm);

	return (
		<div className="p-6">
			<PageHeader
				title="Billing"
				subtitle="Account-wide. Managed by Polar (Merchant of Record)."
			/>

			{/* Current plan card */}
			<Card className="mb-8">
				<CardHeader className="pb-4">
					<div className="flex items-start justify-between">
						<div>
							<CardDescription className="mb-1 text-xs text-muted-foreground">
								Current plan
							</CardDescription>
							<div className="flex items-center gap-2">
								<CardTitle className="text-base font-semibold capitalize">
									{plan}
								</CardTitle>
								<Badge className="h-5 px-1.5 py-0 leading-none text-[10px] border-primary/20 bg-primary/10 text-primary hover:bg-primary/15">
									Active
								</Badge>
							</div>
						</div>
						<p className="text-2xl font-bold text-foreground">
							{planPrice(plan)}
							<span className="text-xs font-normal text-muted-foreground">
								/mo
							</span>
						</p>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 gap-6 border-t border-border/40 pt-4 sm:grid-cols-2 lg:grid-cols-4">
						<div>
							<div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
								<span>Storage usage</span>
								<span className="font-mono">
									{formatBytes(usage.storageBytes)} of {formatBytes(maxStorage)}
								</span>
							</div>
							<Progress value={storagePercent} className="h-2 rounded-none" />
							{storagePercent > 70 && (
								<p className="mt-1.5 flex items-center gap-1 text-xs text-primary">
									<ArrowUpRight className="h-3.5 w-3.5" /> Approaching storage
									cap — consider upgrading
								</p>
							)}
						</div>
						<div>
							<div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
								<span>Connectors budget</span>
								<span className="font-mono">
									{usage.connectorsUsed} of {formatCap(maxConnectors)}
								</span>
							</div>
							<Progress
								value={connectorsPercent}
								className="h-2 rounded-none"
							/>
						</div>
						<div>
							<div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
								<span>Consolidation runs</span>
								<span className="font-mono">
									{consolidationUsed} of {formatCap(maxConsolidation)} / day
								</span>
							</div>
							<Progress
								value={consolidationPercent}
								className="h-2 rounded-none"
							/>
						</div>
						<div>
							<div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
								<span>Pre-warm calls</span>
								<span className="font-mono">
									{preWarmUsed} of {formatCap(maxPreWarm)} / day
								</span>
							</div>
							<Progress value={preWarmPercent} className="h-2 rounded-none" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Plan picker */}
			<h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
				Available plans
			</h3>
			<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
				{PLANS.map((planOption) => {
					const isCurrent = planOption.name.toLowerCase() === plan;
					const included = planOption.features.filter((f) => f.included);
					return (
						<Card
							key={planOption.name}
							className={cn("flex flex-col", {
								"border-primary/50 bg-primary/5":
									isCurrent || planOption.highlight,
								"opacity-70": planOption.soon,
							})}
						>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<CardTitle className="text-base font-semibold">
										{planOption.name}
									</CardTitle>
									{isCurrent && (
										<Badge className="h-5 px-1.5 py-0 leading-none text-[10px] bg-primary text-primary-foreground hover:bg-primary">
											Current
										</Badge>
									)}
									{planOption.soon && (
										<Badge
											variant="secondary"
											className="h-5 px-1.5 py-0 leading-none text-[10px]"
										>
											Soon
										</Badge>
									)}
								</div>
								<div className="mt-2 flex items-baseline gap-0.5">
									<span className="text-2xl font-bold text-foreground">
										{planOption.price}
									</span>
									<span className="text-xs text-muted-foreground">
										{planOption.period}
									</span>
								</div>
							</CardHeader>
							<CardContent className="flex-1 text-xs text-muted-foreground">
								<ul className="mb-4 space-y-2">
									{included.map((f) => (
										<li
											key={f.text}
											className="flex items-center gap-2 font-medium text-foreground"
										>
											<Check className="h-3.5 w-3.5 shrink-0 text-primary" />
											{f.text}
										</li>
									))}
								</ul>
							</CardContent>
							<CardFooter className="pb-5 pt-0">
								{isCurrent ? (
									<Button
										variant="outline"
										className="mt-4 h-9 w-full text-xs"
										disabled
									>
										Current plan
									</Button>
								) : planOption.soon ? (
									<Button
										variant="outline"
										className="h-9 w-full text-xs"
										disabled
									>
										Coming soon
									</Button>
								) : (
									<Button
										className="h-9 w-full gap-1 text-xs"
										asChild={
											!!checkoutProductIdFor(
												planOption.name,
												proProductId,
												teamsProductId,
											)
										}
										disabled={
											!checkoutProductIdFor(
												planOption.name,
												proProductId,
												teamsProductId,
											)
										}
									>
										<a
											href={checkoutUrl(
												planOption.name,
												accountId,
												proProductId,
												teamsProductId,
											)}
										>
											Upgrade to {planOption.name}{" "}
											<ExternalLink className="h-3 w-3" />
										</a>
									</Button>
								)}
							</CardFooter>
						</Card>
					);
				})}
			</div>

			{/* Manage subscription */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-semibold">
						Manage subscription
					</CardTitle>
					<CardDescription className="text-xs">
						Invoices, payment method, and cancellation are managed in your
						portal.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Button
						variant="outline"
						className="h-9 gap-1.5 text-xs"
						asChild={!!accountId}
						disabled={!accountId}
					>
						<a
							href={
								accountId
									? `/v1/billing/portal?account_id=${accountId}`
									: undefined
							}
						>
							Manage <ExternalLink className="h-3.5 w-3.5" />
						</a>
					</Button>
					<p className="text-[10px] leading-normal text-muted-foreground">
						You'll see "Polar · TekBreed" on your statement. Questions?{" "}
						<a
							href={SITE_LINKS.billingEmail}
							className="text-primary hover:underline"
						>
							billing@memofs.dev
						</a>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

/**
 * Price label for the current-plan card. Matches the `PLANS` catalog (ADR 0006)
 * by the lowercase plan enum; defaults to "$0" for an unrecognised/free plan.
 * Kept here rather than derived from `PLANS` to surface the `/mo` unit the card
 * renders (the catalog's `period` is "/mo" for Pro but "forever" for Free).
 */
function planPrice(plan: AccountView["plan"]): string {
	if (plan === "pro") return "$9";
	if (plan === "teams") return "$24";
	return "$0";
}

/**
 * Renders an entitlement cap for display: `Infinity` (Teams unlimited) → the
 * literal "Unlimited"; a finite number → its plain value. Mirrors the catalog's
 * "Unlimited connectors" copy, so the data path and marketing agree (SSOT).
 */
function formatCap(cap: number): string {
	return Number.isFinite(cap) ? String(cap) : "Unlimited";
}

/**
 * Usage percentage for a cap: `used / cap * 100`, clamped to [0, 100]. An
 * unlimited cap (`Infinity`) always reads 0% — there is no ceiling to approach.
 */
function capPercent(used: number, cap: number): number {
	if (!Number.isFinite(cap) || cap <= 0) return 0;
	return Math.min((used / cap) * 100, 100);
}

/**
 * Resolves the Polar product ID for a plan name from the env-configured IDs.
 * Returns `undefined` when the product isn't configured (env var unset) or the
 * plan isn't billable (Free).
 */
function checkoutProductIdFor(
	planName: string,
	proProductId?: string,
	teamsProductId?: string,
): string | undefined {
	const lower = planName.toLowerCase();
	if (lower === "pro") return proProductId;
	if (lower === "teams") return teamsProductId;
	return undefined;
}

/**
 * Builds the checkout URL for a plan upgrade. The `/v1/billing/checkout`
 * endpoint receives `?products=<id>&metadata=<json>` — the metadata carries
 * `memofs_account_id` + `memofs_plan` so the Polar webhook can link the
 * subscription back to the account and apply the right caps (ADR 0006).
 * Returns `undefined` when the product ID isn't configured (button renders
 * disabled).
 */
function checkoutUrl(
	planName: string,
	accountId?: string,
	proProductId?: string,
	teamsProductId?: string,
): string | undefined {
	const productId = checkoutProductIdFor(
		planName,
		proProductId,
		teamsProductId,
	);
	if (!productId || !accountId) return undefined;
	const metadata = JSON.stringify({
		memofs_account_id: accountId,
		memofs_plan: planName.toLowerCase(),
	});
	return `/v1/billing/checkout?products=${encodeURIComponent(productId)}&metadata=${encodeURIComponent(metadata)}`;
}
