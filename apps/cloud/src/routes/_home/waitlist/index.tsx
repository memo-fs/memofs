import {
	ArrowRight,
	CheckCircle2,
	Loader2,
	Mail,
	Sparkles,
} from "lucide-react";
import { useFetcher } from "react-router";
import { Section } from "~/components/site/visuals";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import type { action } from "./+action.server";
import type { Route } from "./+types/index";

export { action } from "./+action.server";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Join the waitlist — Memo FS Cloud" },
		{
			name: "description",
			content:
				"Be among the first to access Memo FS Cloud — local-first AI memory with a hosted serverless recall engine. Reserve your early access spot now.",
		},
	];
}

const PERKS = [
	"Early access before public launch",
	"Locked-in launch pricing",
	"Direct feedback channel to the core team",
	"Open-source — own your data, forever",
];

/** Waitlist landing page — captures an email, calls Resend via the action. */
export default function WaitlistPage(_props: Route.ComponentProps) {
	const fetcher = useFetcher<typeof action>();
	const submitting = fetcher.state === "submitting";
	const result = fetcher.data;

	return (
		<Section className="relative min-h-[calc(100dvh-4rem)] flex items-center justify-center py-20">
			<div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
			<div className="relative w-full max-w-lg mx-auto text-center flex flex-col items-center gap-8">
				<div className="flex flex-col items-center gap-4">
					<div className="inline-flex items-center gap-2 px-2.5 py-1 border border-border bg-card/60 backdrop-blur-md rounded-none">
						<Sparkles className="size-3 text-accent-gold" />
						<span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
							Early access
						</span>
					</div>
					<h1 className="font-medium text-balance text-4xl md:text-5xl tracking-tight text-white">
						Reserve your spot.
					</h1>
					<p className="text-base text-muted-foreground font-light max-w-sm leading-relaxed">
						Memo FS Cloud is launching soon. Join the waitlist and be first in
						line when we open the doors.
					</p>
				</div>

				<div className="w-full border border-border bg-card/40 backdrop-blur-md p-8">
					{result?.ok ? (
						<SuccessState email={result.email} />
					) : (
						<WaitlistForm
							fetcher={fetcher}
							submitting={submitting}
							error={result?.ok === false ? result.error : undefined}
						/>
					)}
				</div>

				<ul className="flex flex-col gap-2 text-sm text-muted-foreground w-full text-left">
					{PERKS.map((perk) => (
						<li key={perk} className="flex items-center gap-2.5">
							<CheckCircle2 className="size-4 text-primary shrink-0" />
							{perk}
						</li>
					))}
				</ul>
			</div>
		</Section>
	);
}

function WaitlistForm({
	fetcher,
	submitting,
	error,
}: {
	fetcher: ReturnType<typeof useFetcher<typeof action>>;
	submitting: boolean;
	error?: string;
}) {
	return (
		<fetcher.Form method="post" className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5 text-left">
				<Label
					htmlFor="email"
					className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
				>
					Email address
				</Label>
				<div className="flex gap-2">
					<Input
						id="email"
						name="email"
						type="email"
						required
						placeholder="you@example.com"
						autoComplete="email"
						className="flex-1 rounded-none bg-background/60 border-border focus-visible:border-primary"
					/>
					<Button
						type="submit"
						size="default"
						disabled={submitting}
						className="shrink-0 rounded-none gap-2 bg-white hover:bg-gray-200 text-black font-medium"
					>
						{submitting ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<>
								Join
								<ArrowRight className="size-4" />
							</>
						)}
					</Button>
				</div>
				{error ? (
					<p className="text-xs text-destructive mt-1">{error}</p>
				) : null}
			</div>
			<p className="text-[11px] text-muted-foreground/60 text-center">
				No spam, ever. Unsubscribe at any time.
			</p>
		</fetcher.Form>
	);
}

function SuccessState({ email }: { email: string }) {
	return (
		<div className="flex flex-col items-center gap-4 py-2">
			<div
				className={cn(
					"flex size-12 items-center justify-center border border-primary/30 bg-primary/5",
				)}
			>
				<Mail className="size-5 text-primary" />
			</div>
			<div className="flex flex-col gap-1 text-center">
				<p className="text-sm font-medium text-foreground">
					You're on the list!
				</p>
				<p className="text-xs text-muted-foreground">
					We've sent a confirmation to{" "}
					<span className="font-mono text-foreground">{email}</span>. We'll be
					in touch when early access opens.
				</p>
			</div>
		</div>
	);
}
