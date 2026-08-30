import { HomeLayout } from "fumadocs-ui/layouts/home";
import { useState } from "react";
import { Link } from "react-router";
import { BottomCta } from "../components/bottom-cta";
import { ComparisonSection } from "../components/comparison-section";
import { FeaturesSection } from "../components/features-section";
import { Footer } from "../components/footer";
import { ProblemSection } from "../components/problem-section";
import { RuntimesSection } from "../components/runtimes-section";
import { baseOptions } from "../lib/layout.shared";
import { createPageMeta } from "../lib/meta";
import { ROUTES } from "../lib/site";
import type { Route } from "./+types/index";

export const meta: Route.MetaFunction = () => {
	const pageTitle = "MemoFS — The File-First Memory for AI Agents";
	const description =
		"Store decisions and facts as markdown in your repository. Deterministic local execution, git-branchable memory, and cloud synchronization for AI agents.";

	return createPageMeta({ title: pageTitle, description, path: ROUTES.home });
};

function CommandPrompt() {
	const [copied, setCopied] = useState(false);
	const command = "npx @memofs/cli init";

	const onCopy = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(command);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<button
			onClick={onCopy}
			type="button"
			className="group relative mt-4 inline-flex cursor-pointer items-center gap-2 font-mono text-xs text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 sm:text-sm"
			title="Click to copy"
		>
			<span className="text-zinc-500 transition-colors group-hover:text-zinc-800 dark:text-zinc-500 dark:group-hover:text-zinc-300">
				~
			</span>
			<span>{command}</span>
			<span className="ml-1 inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] text-zinc-500 transition-colors group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200">
				{copied ? "copied" : ""}
			</span>
		</button>
	);
}

export default function HomePage() {
	return (
		<HomeLayout {...baseOptions()}>
			{/* 1. HERO SECTION */}
			<div className="relative flex min-h-[calc(100dvh-3.5rem)] w-full flex-col justify-center overflow-hidden bg-white text-zinc-900 dark:bg-black dark:text-white px-4 sm:px-6 lg:px-8 py-12 md:py-0 transition-colors duration-300">
				{/* Ambient background glow */}
				<div
					className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[650px] rounded-full bg-zinc-200/60 dark:bg-zinc-900/30 blur-[120px] -z-10"
					aria-hidden="true"
				/>

				{/* Contained hero blueprint box */}
				<div className="relative mx-auto w-full max-w-5xl px-4 sm:px-8">
					{/* Top Extension Space & Guide with crossing lines */}
					<div className="relative border-b border-dashed border-zinc-300/90 dark:border-zinc-800/80 py-2 sm:py-3">
						{/* Horizontal line extending past left/right edges */}
						<div className="pointer-events-none absolute -left-6 -right-6 bottom-0 border-b border-dashed border-zinc-300/90 dark:border-zinc-800/80 sm:-left-10 sm:-right-10" />

						{/* Top Left Circle with smooth rotation animation */}
						<div
							className="pointer-events-none absolute -left-8 -bottom-8 h-16 w-16 rounded-full border border-dashed border-zinc-400 dark:border-zinc-700/80 animate-slow-spin sm:-left-10 sm:-bottom-10 sm:h-20 sm:w-20"
							aria-hidden="true"
						/>

						{/* Outer left/right vertical lines extending up through top guide */}
						<div className="pointer-events-none absolute left-0 -top-4 bottom-0 border-l border-dashed border-zinc-300/90 dark:border-zinc-800/80 sm:-top-6" />
						<div className="pointer-events-none absolute right-0 -top-4 bottom-0 border-r border-dashed border-zinc-300/90 dark:border-zinc-800/80 sm:-top-6" />

						{/* Top inner vertical lines (aligned with bottom button column) */}
						<div className="grid grid-cols-12 h-full">
							<div className="col-span-12 md:col-start-4 md:col-span-6 border-x border-dashed border-zinc-300/90 dark:border-zinc-800/80 h-4 sm:h-6" />
						</div>

						{/* Subtle beam sweep on top line */}
						<div className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden">
							<div className="h-full w-48 bg-linear-to-r from-transparent via-zinc-400/50 to-transparent animate-beam" />
						</div>
					</div>

					{/* Main Grid Content Area */}
					<div className="relative">
						{/* Outer left/right vertical lines extending past top and bottom */}
						<div className="pointer-events-none absolute left-0 -top-6 -bottom-6 border-l border-dashed border-zinc-300/90 dark:border-zinc-800/80 sm:-top-10 sm:-bottom-10" />
						<div className="pointer-events-none absolute right-0 -top-6 -bottom-6 border-r border-dashed border-zinc-300/90 dark:border-zinc-800/80 sm:-top-10 sm:-bottom-10" />

						{/* Top horizontal line extending past corners */}
						<div className="pointer-events-none absolute -left-6 -right-6 top-0 border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80 sm:-left-10 sm:-right-10" />

						{/* Top Left Circle centered at the top-left intersection */}
						<div
							className="pointer-events-none absolute -left-8 -top-8 h-16 w-16 rounded-full border border-dashed border-zinc-400 dark:border-zinc-700/80 animate-slow-spin sm:-left-10 sm:-top-10 sm:h-20 sm:w-20"
							aria-hidden="true"
						/>

						{/* Headline Section (Full Width) */}
						<div className="px-4 py-8 text-center sm:px-8 sm:py-10 md:py-12">
							<h1 className="mx-auto max-w-4xl text-balance text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl md:text-5xl lg:text-6xl">
								The File-First Memory Runtime for AI Agents
							</h1>
						</div>

						{/* Middle Horizontal Border with extensions */}
						<div className="relative border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80">
							<div className="pointer-events-none absolute -left-6 -right-6 top-0 border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80 sm:-left-10 sm:-right-10" />
							{/* Light beam on middle line */}
							<div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
								<div className="h-full w-64 bg-linear-to-r from-transparent via-zinc-400/40 to-transparent animate-beam [animation-delay:2s]" />
							</div>
						</div>

						{/* Subtitle Section (Full Width) */}
						<div className="px-4 py-5 text-center sm:px-8 sm:py-6 md:py-8">
							<p className="mx-auto max-w-2xl text-balance text-xs sm:text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
								Store decisions as simple markdown files —{" "}
								<strong className="font-semibold text-zinc-900 dark:text-zinc-100">
									versioned, portable, and always there when the next session
									starts
								</strong>
								.
							</p>
						</div>

						{/* Lower Horizontal Border with extensions */}
						<div className="relative border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80">
							<div className="pointer-events-none absolute -left-6 -right-6 top-0 border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80 sm:-left-10 sm:-right-10" />
						</div>

						{/* CTA & CLI Section (Third Row with two vertical lines housing buttons & command) */}
						<div className="relative grid grid-cols-12">
							{/* Left empty flank */}
							<div className="hidden md:block md:col-span-3" />

							{/* Center column housing buttons and install command with vertical dashed borders */}
							<div className="relative col-span-12 md:col-span-6 border-dashed border-zinc-300/90 dark:border-zinc-800/80 md:border-x px-4 py-6 text-center sm:px-6 sm:py-8 md:py-10">
								{/* Inner vertical lines extending downward past bottom line */}
								<div className="hidden md:block pointer-events-none absolute left-0 -bottom-6 border-l border-dashed border-zinc-300/90 dark:border-zinc-800/80 h-6 sm:-bottom-10 sm:h-10" />
								<div className="hidden md:block pointer-events-none absolute right-0 -bottom-6 border-r border-dashed border-zinc-300/90 dark:border-zinc-800/80 h-6 sm:-bottom-10 sm:h-10" />

								{/* Bottom Right Circle on the inner column intersection */}
								<div
									className="pointer-events-none absolute -right-8 -bottom-8 h-16 w-16 rounded-full border border-dashed border-zinc-400 dark:border-zinc-700/80 animate-reverse-spin sm:-right-10 sm:-bottom-10 sm:h-20 sm:w-20"
									aria-hidden="true"
								/>

								<div className="flex flex-wrap items-center justify-center gap-3">
									<Link
										to="/docs/introduction"
										className="inline-flex h-9 sm:h-10 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 px-4 sm:px-5 text-xs sm:text-sm font-medium transition-colors shadow-sm"
									>
										Get Started
									</Link>
									<a
										href="https://github.com/memo-fs/memofs"
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex h-9 sm:h-10 items-center justify-center rounded border border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white px-4 sm:px-5 text-xs sm:text-sm font-medium transition-colors"
									>
										GitHub
									</a>
								</div>

								<div className="flex justify-center">
									<CommandPrompt />
								</div>
							</div>

							{/* Right empty flank */}
							<div className="hidden md:block md:col-span-3" />
						</div>

						{/* Bottom Border with extensions */}
						<div className="relative border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80">
							<div className="pointer-events-none absolute -left-6 -right-6 top-0 border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80 sm:-left-10 sm:-right-10" />
							{/* Light beam on bottom line */}
							<div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
								<div className="h-full w-56 bg-linear-to-r from-transparent via-zinc-400/40 to-transparent animate-beam [animation-delay:4s]" />
							</div>
						</div>
					</div>

					{/* Bottom Extension Space */}
					<div className="relative py-2 sm:py-3">
						{/* Outer left/right vertical lines extending down through bottom guide */}
						<div className="pointer-events-none absolute left-0 top-0 h-4 sm:h-6 border-l border-dashed border-zinc-300/90 dark:border-zinc-800/80" />
						<div className="pointer-events-none absolute right-0 top-0 h-4 sm:h-6 border-r border-dashed border-zinc-300/90 dark:border-zinc-800/80" />
					</div>
				</div>
			</div>

			{/* 2. THE PROBLEM (DIRECTLY AFTER HERO) */}
			<ProblemSection />

			{/* 3. RUNTIMES (LINEAR 3-COLUMN CARD LAYOUT) */}
			<RuntimesSection />

			{/* 4. FEATURES & CAPABILITIES */}
			<FeaturesSection />

			{/* 5. COMPARISON MATRIX */}
			<ComparisonSection />

			{/* 6. BOTTOM CTA */}
			<BottomCta />

			{/* 7. FOOTER */}
			<Footer />
		</HomeLayout>
	);
}
