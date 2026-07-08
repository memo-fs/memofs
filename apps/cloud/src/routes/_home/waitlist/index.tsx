import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import {
	ArrowRight,
	CheckCircle2,
	Loader2,
	Sparkles,
} from "lucide-react";
import { useFetcher } from "react-router";
import { Section } from "~/components/site/visuals";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { buildMeta } from "~/lib/seo";
import { FormError } from "../../_auth/+components/form-parts";
import type { Route } from "./+types/index";
import { type WaitlistResult, WaitlistSchema } from "./+utils";

export { action } from "./+action.server";

export function meta(_: Route.MetaArgs) {
	return buildMeta({
		title: "Join the waitlist — Memo FS Cloud",
		description:
			"Be among the first to access Memo FS Cloud — local-first AI memory with a hosted serverless recall engine. Reserve your early access spot now.",
		path: "/waitlist",
	});
}

const PERKS = [
	"Early access before public launch",
	"Locked-in launch pricing",
	"Direct feedback channel to the core team",
	"Open-source — own your data, forever",
];

export { action } from "./+actions.server";


/** Waitlist landing page — captures an email, calls Resend via the action. */
export default function WaitlistPage(_props: Route.ComponentProps) {
	const fetcher = useFetcher<WaitlistResult>();
	const submitting = fetcher.state === "submitting";
	const result = fetcher.data;

	const [form, fields] = useForm({
		lastResult: result,
		constraint: getZodConstraint(WaitlistSchema),
		onValidate: ({ formData }) =>
			parseWithZod(formData, { schema: WaitlistSchema }),
		shouldRevalidate: "onInput",
	});

	if (result && "email" in result) {
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
							You're on the list!
						</h1>
						<p className="text-base text-muted-foreground font-light max-w-sm leading-relaxed">
							We've sent a confirmation to{" "}
							<span className="font-mono text-foreground">{result.email}</span>.
							We'll be in touch when early access opens.
						</p>
					</div>
				</div>
			</Section>
		);
	}

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
					<fetcher.Form
						{...getFormProps(form)}
						method="post"
						className="flex flex-col gap-4"
					>
						<div className="flex flex-col gap-1.5 text-left">
							<Label
								htmlFor={fields.email.id}
								className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
							>
								Email address
							</Label>
							<div className="flex gap-2">
								<Input
									{...getInputProps(fields.email, { type: "email" })}
									key={fields.email.key}
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
							{fields.email.errors && <FormError errors={fields.email.errors} />}
						</div>
						{form.errors && <FormError errors={form.errors} />}
						<p className="text-[11px] text-muted-foreground/60 text-center">
							No spam, ever. Unsubscribe at any time.
						</p>
					</fetcher.Form>
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
