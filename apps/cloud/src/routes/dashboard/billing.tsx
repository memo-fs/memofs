import { ArrowUpRight, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
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
import { SITE_LINKS } from "~/lib/site";
import { cn } from "~/lib/utils";
import { getEnv } from "~/server/context.server";
import type { AccountView } from "~/server/queries";
import { getAccountUsage } from "~/server/queries";
import { requireUserWithAccount } from "~/server/session.server";
import { formatBytes } from "~/utils/format";
import { PLANS } from "../_home/+utils/plans";
import { PageHeader } from "./+components/page-header";
import type { Route } from "./+types/billing";

/**
 * Billing (SC3.5). Account-wide: plan + usage snapshot from the real DB;
 * checkout/portal handled by Polar (Merchant of Record, ADR 0006) — we link out,
 * we don't build a billing engine. The plan picker's "Current" badge is driven
 * by the account's real `plan` enum, matched case-insensitively against the
 * `PLANS` catalog (catalog names are display-cased, the enum is lowercase).
 *
 * Storage + connectors caps come from the entitlement snapshot
 * (`maxHostedStorageBytes` / `maxConnectors`); usage is the account-wide rollup.
 */

export function meta(_: Route.MetaArgs) {
	return [{ title: "Billing — TekMemo Cloud" }];
}

/** Server data: the entitlement snapshot + account-wide usage. */
export interface BillingLoaderData {
	account: AccountView | null;
	usage: { storageBytes: number; connectorsUsed: number };
}

export async function loader({
	request,
	context,
}: Route.LoaderArgs): Promise<BillingLoaderData> {
	const { db, account } = await requireUserWithAccount(
		request,
		getEnv(context),
	);
	const usage = account
		? await getAccountUsage(db, account.id)
		: { storageBytes: 0, connectorsUsed: 0 };
	return { account, usage };
}

export default function BillingPage({ loaderData }: Route.ComponentProps) {
	const { account, usage } = loaderData;
	const [notifyEmail, setNotifyEmail] = useState("");
	const [notified, setNotified] = useState(false);

	const maxStorage = account?.maxHostedStorageBytes ?? 0;
	const maxConnectors = account?.maxConnectors ?? 0;
	const plan = account?.plan ?? "free";
	const storagePercent =
		maxStorage > 0 ? (usage.storageBytes / maxStorage) * 100 : 0;
	const connectorsPercent =
		maxConnectors > 0 ? (usage.connectorsUsed / maxConnectors) * 100 : 0;

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
					<div className="grid grid-cols-1 gap-6 border-t border-border/40 pt-4 sm:grid-cols-2">
						<div>
							<div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
								<span>Storage usage</span>
								<span className="font-mono">
									{formatBytes(usage.storageBytes)} of {formatBytes(maxStorage)}
								</span>
							</div>
							<Progress value={storagePercent} className="h-2" />
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
									{usage.connectorsUsed} of {maxConnectors}
								</span>
							</div>
							<Progress value={connectorsPercent} className="h-2" />
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
									<div className="w-full space-y-2">
										<Button
											variant="outline"
											className="h-9 w-full text-xs"
											disabled
										>
											Coming soon
										</Button>
										{!notified ? (
											<div className="flex gap-1.5">
												<input
													type="email"
													placeholder="you@example.com"
													value={notifyEmail}
													onChange={(e) => setNotifyEmail(e.target.value)}
													className="h-8 flex-1 rounded-md border border-border/40 bg-background px-2.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
												/>
												<Button
													size="sm"
													className="h-8 shrink-0 text-[10px]"
													onClick={() => setNotified(true)}
													disabled={!notifyEmail}
												>
													Notify me
												</Button>
											</div>
										) : (
											<p className="text-center text-[10px] font-medium text-primary">
												✓ We'll let you know!
											</p>
										)}
									</div>
								) : (
									<Button className="h-9 w-full gap-1 text-xs">
										Upgrade to {planOption.name}{" "}
										<ExternalLink className="h-3 w-3" />
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
					<Button variant="outline" className="h-9 gap-1.5 text-xs" asChild>
						<a
							href="https://polar.sh"
							target="_blank"
							rel="noopener noreferrer"
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
							billing@tekbreed.com
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
