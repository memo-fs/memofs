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
import { cn } from "~/lib/utils";
import { formatBytes, MOCK_ACCOUNT } from "~/utils/mock-data";
import { PLANS } from "../_home/+utils/plans";

export function meta() {
	return [{ title: "Billing — TekMemo Cloud" }];
}

export default function BillingPage() {
	const [notifyEmail, setNotifyEmail] = useState("");
	const [notified, setNotified] = useState(false);

	const storagePercent =
		(MOCK_ACCOUNT.storageBytes / MOCK_ACCOUNT.maxStorageBytes) * 100;
	const connectorsPercent =
		(MOCK_ACCOUNT.connectorsUsed / MOCK_ACCOUNT.maxConnectors) * 100;

	return (
		<div className="p-6">
			<div className="mb-6">
				<h2 className="text-xl font-bold tracking-tight mb-0.5">Billing</h2>
				<p className="text-xs text-muted-foreground">
					Account-wide. Managed by Polar (Merchant of Record).
				</p>
			</div>

			{/* Current plan card */}
			<Card className="mb-8">
				<CardHeader className="pb-4">
					<div className="flex items-start justify-between">
						<div>
							<CardDescription className="text-xs text-muted-foreground mb-1">
								Current plan
							</CardDescription>
							<div className="flex items-center gap-2">
								<CardTitle className="text-base font-semibold">
									{MOCK_ACCOUNT.plan}
								</CardTitle>
								<Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 text-[10px] py-0 px-1.5 h-5 leading-none">
									Active
								</Badge>
							</div>
						</div>
						<p className="text-2xl font-bold text-foreground">
							$0
							<span className="text-xs font-normal text-muted-foreground">
								/mo
							</span>
						</p>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/40">
						<div>
							<div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
								<span>Storage usage</span>
								<span className="font-mono">
									{formatBytes(MOCK_ACCOUNT.storageBytes)} of{" "}
									{formatBytes(MOCK_ACCOUNT.maxStorageBytes)}
								</span>
							</div>
							<Progress value={storagePercent} className="h-2" />
							{storagePercent > 70 && (
								<p className="text-xs text-primary mt-1.5 flex items-center gap-1">
									<ArrowUpRight className="w-3.5 h-3.5" /> Approaching storage
									cap — consider upgrading
								</p>
							)}
						</div>
						<div>
							<div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
								<span>Connectors budget</span>
								<span className="font-mono">
									{MOCK_ACCOUNT.connectorsUsed} of {MOCK_ACCOUNT.maxConnectors}
								</span>
							</div>
							<Progress value={connectorsPercent} className="h-2" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Plan picker */}
			<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
				Available plans
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				{PLANS.map((plan) => {
					const isCurrent = plan.name === MOCK_ACCOUNT.plan;
					const included = plan.features.filter((f) => f.included);
					return (
						<Card
							key={plan.name}
							className={cn("flex flex-col", {
								"border-primary/50 bg-primary/5": isCurrent || plan.highlight,
								"opacity-70": plan.soon,
							})}
						>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<CardTitle className="text-base font-semibold">
										{plan.name}
									</CardTitle>
									{isCurrent && (
										<Badge className="bg-primary text-primary-foreground hover:bg-primary text-[10px] py-0 px-1.5 h-5 leading-none">
											Current
										</Badge>
									)}
									{plan.soon && (
										<Badge
											variant="secondary"
											className="text-[10px] py-0 px-1.5 h-5 leading-none"
										>
											Soon
										</Badge>
									)}
								</div>
								<div className="flex items-baseline gap-0.5 mt-2">
									<span className="text-2xl font-bold text-foreground">
										{plan.price}
									</span>
									<span className="text-muted-foreground text-xs">
										{plan.period}
									</span>
								</div>
							</CardHeader>
							<CardContent className="flex-1 text-xs text-muted-foreground">
								<ul className="space-y-2 mb-4">
									{included.map((f) => (
										<li
											key={f.text}
											className="flex items-center gap-2 text-foreground font-medium"
										>
											<Check className="w-3.5 h-3.5 text-primary shrink-0" />
											{f.text}
										</li>
									))}
								</ul>
							</CardContent>
							<CardFooter className="pt-0 pb-5">
								{isCurrent ? (
									<Button
										variant="outline"
										className="w-full text-xs h-9 mt-4"
										disabled
									>
										Current plan
									</Button>
								) : plan.soon ? (
									<div className="space-y-2 w-full">
										<Button
											variant="outline"
											className="w-full text-xs h-9"
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
													className="flex-1 h-8 rounded-md border border-border/40 bg-background px-2.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
												/>
												<Button
													size="sm"
													className="h-8 text-[10px] shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
													onClick={() => setNotified(true)}
													disabled={!notifyEmail}
												>
													Notify me
												</Button>
											</div>
										) : (
											<p className="text-[10px] text-primary text-center font-medium">
												✓ We'll let you know!
											</p>
										)}
									</div>
								) : (
									<Button className="w-full text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
										Upgrade to {plan.name} <ExternalLink className="w-3 h-3" />
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
					<Button variant="outline" className="text-xs h-9 gap-1.5" asChild>
						<a
							href="https://polar.sh"
							target="_blank"
							rel="noopener noreferrer"
						>
							Manage <ExternalLink className="w-3.5 h-3.5" />
						</a>
					</Button>
					<p className="text-[10px] text-muted-foreground leading-normal">
						You'll see "Polar · TekBreed" on your statement. Questions?{" "}
						<a
							href="mailto:billing@tekbreed.com"
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
