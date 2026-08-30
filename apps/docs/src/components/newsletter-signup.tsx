/** Newsletter signup UI backed by the Cloudflare Pages `/subscribe` Function. */

import { type FormEvent, useState } from "react";

/** Presentation variants for a newsletter signup form. */
interface NewsletterSignupProps {
	variant?: "strip" | "card";
	title?: string;
	description?: string;
	className?: string;
}

/** Response body returned by the Pages Function. */
interface SignupResponse {
	ok?: boolean;
	error?: string;
}

/** Renders a reusable signup form that posts directly to the Pages Function. */
export function NewsletterSignup({
	variant = "strip",
	title = "Stay in the loop",
	description = "New releases, SDK updates, and architecture deep dives straight to your inbox.",
	className = "",
}: NewsletterSignupProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string>();

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);
		setErrorMessage(undefined);

		try {
			const response = await fetch("/subscribe", {
				method: "POST",
				body: new FormData(event.currentTarget),
			});
			const payload = (await response.json()) as SignupResponse;

			if (!response.ok || !payload.ok) {
				setErrorMessage(
					payload.error ?? "Subscription failed. Please try again.",
				);
				return;
			}

			setIsSuccess(true);
		} catch {
			setErrorMessage("Subscription failed. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	}

	const form = (
		<form
			method="post"
			action="/subscribe"
			onSubmit={handleSubmit}
			className={
				variant === "strip"
					? "flex flex-col gap-2 sm:flex-row sm:items-center"
					: "flex flex-col gap-2.5 sm:flex-row sm:items-center"
			}
		>
			<input
				type="email"
				name="email"
				placeholder="you@domain.com"
				autoComplete="email"
				aria-label="Email address"
				disabled={isSubmitting}
				required
				className={
					variant === "strip"
						? "h-9 w-full sm:flex-1 rounded border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/90 px-3 font-mono text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:focus:border-zinc-400 transition-colors disabled:opacity-60"
						: "h-10 w-full sm:flex-1 rounded border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/90 px-3.5 font-mono text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:focus:border-zinc-400 transition-colors disabled:opacity-60"
				}
			/>
			<button
				type="submit"
				disabled={isSubmitting}
				className={
					variant === "strip"
						? "inline-flex h-9 shrink-0 items-center justify-center rounded bg-zinc-900 px-4 font-mono text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-60 cursor-pointer"
						: "inline-flex h-10 shrink-0 items-center justify-center rounded bg-zinc-900 px-5 font-mono text-xs sm:text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-60 cursor-pointer"
				}
			>
				{isSubmitting ? "Subscribing…" : "Subscribe"}
			</button>
		</form>
	);

	const result = isSuccess ? (
		<div className="flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-50/60 px-3.5 py-2 text-xs font-mono text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
			<span>✓</span>
			<span>You&apos;re in. Welcome email on its way.</span>
		</div>
	) : (
		form
	);

	if (variant === "strip") {
		return (
			<div
				className={`w-full border-b border-dashed border-zinc-200 pb-10 dark:border-zinc-800/80 ${className}`}
			>
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
					<div className="max-w-xl">
						<div className="flex items-center gap-2">
							<span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
							<span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
								Newsletter
							</span>
						</div>
						<h3 className="mt-1 text-base font-semibold text-zinc-900 dark:text-white">
							{title}
						</h3>
						<p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
							{description}
						</p>
					</div>
					<div className="w-full lg:max-w-md">{result}</div>
				</div>
				{errorMessage && !isSuccess && (
					<p className="mt-1.5 font-mono text-[11px] text-rose-600 dark:text-rose-400">
						{errorMessage}
					</p>
				)}
			</div>
		);
	}

	return (
		<div
			className={`rounded border border-dashed border-zinc-300 bg-zinc-50/70 p-6 dark:border-zinc-800 dark:bg-zinc-950/60 sm:p-8 ${className}`}
		>
			<div className="max-w-xl">
				<span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
					Newsletter
				</span>
				<h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
					{title}
				</h3>
				<p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
					{description}
				</p>
			</div>
			<div className="mt-6">{result}</div>
			{errorMessage && !isSuccess && (
				<p className="mt-2 font-mono text-[11px] text-rose-600 dark:text-rose-400">
					{errorMessage}
				</p>
			)}
		</div>
	);
}
