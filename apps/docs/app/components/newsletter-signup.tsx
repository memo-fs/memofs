import { useFetcher } from "react-router";

interface NewsletterSignupProps {
	variant?: "strip" | "card";
	title?: string;
	description?: string;
	className?: string;
}

export function NewsletterSignup({
	variant = "strip",
	title = "Stay in the loop",
	description = "New releases, SDK updates, and architecture deep dives straight to your inbox.",
	className = "",
}: NewsletterSignupProps) {
	const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
	const isSubmitting = fetcher.state === "submitting";
	const isSuccess = Boolean(fetcher.data?.ok);
	const errorMessage = fetcher.data?.error;

	if (variant === "strip") {
		return (
			<div
				className={`w-full border-b border-dashed border-zinc-200 dark:border-zinc-800/80 pb-10 ${className}`}
			>
				<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
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

					<div className="w-full lg:max-w-md">
						{isSuccess ? (
							<div className="flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 px-3.5 py-2 text-xs font-mono text-emerald-700 dark:text-emerald-300">
								<span>✓</span>
								<span>You&apos;re in. Welcome email on its way.</span>
							</div>
						) : (
							<fetcher.Form
								method="post"
								action="/subscribe"
								className="flex flex-col gap-2 sm:flex-row sm:items-center"
							>
								<input
									type="email"
									name="email"
									placeholder="you@domain.com"
									autoComplete="email"
									aria-label="Email address"
									disabled={isSubmitting}
									required
									className="h-9 w-full sm:flex-1 rounded border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/90 px-3 font-mono text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:focus:border-zinc-400 transition-colors disabled:opacity-60"
								/>
								<button
									type="submit"
									disabled={isSubmitting}
									className="inline-flex h-9 shrink-0 items-center justify-center rounded bg-zinc-900 px-4 font-mono text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-60 cursor-pointer"
								>
									{isSubmitting ? "Subscribing…" : "Subscribe"}
								</button>
							</fetcher.Form>
						)}
						{errorMessage && !isSuccess && (
							<p className="mt-1.5 font-mono text-[11px] text-rose-600 dark:text-rose-400">
								{errorMessage}
							</p>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`rounded border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 p-6 sm:p-8 ${className}`}
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

			<div className="mt-6">
				{isSuccess ? (
					<div className="flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 px-3.5 py-2.5 text-xs font-mono text-emerald-700 dark:text-emerald-300">
						<span>✓</span>
						<span>You&apos;re in. Welcome email on its way.</span>
					</div>
				) : (
					<fetcher.Form
						method="post"
						action="/subscribe"
						className="flex flex-col gap-2.5 sm:flex-row sm:items-center"
					>
						<input
							type="email"
							name="email"
							placeholder="you@domain.com"
							autoComplete="email"
							aria-label="Email address"
							disabled={isSubmitting}
							required
							className="h-10 w-full sm:flex-1 rounded border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/90 px-3.5 font-mono text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:focus:border-zinc-400 transition-colors disabled:opacity-60"
						/>
						<button
							type="submit"
							disabled={isSubmitting}
							className="inline-flex h-10 shrink-0 items-center justify-center rounded bg-zinc-900 px-5 font-mono text-xs sm:text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-60 cursor-pointer"
						>
							{isSubmitting ? "Subscribing…" : "Subscribe"}
						</button>
					</fetcher.Form>
				)}
				{errorMessage && !isSuccess && (
					<p className="mt-2 font-mono text-[11px] text-rose-600 dark:text-rose-400">
						{errorMessage}
					</p>
				)}
			</div>
		</div>
	);
}
