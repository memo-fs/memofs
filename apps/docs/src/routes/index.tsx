import { HomeLayout } from "fumadocs-ui/layouts/home";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
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
	const pageTitle = "MemoFS — The File-First Memory Runtime for AI Agents";
	const description =
		"Store decisions, facts, and context as markdown in your project. Deterministic local execution, git-branchable memory, and cloud synchronization for AI agents, research workflows, and applications.";

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
			className="group relative mt-4 inline-flex cursor-pointer items-center gap-2 font-mono text-xs text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground sm:text-sm"
			title="Click to copy"
		>
			<span className="text-muted-foreground transition-colors group-hover:text-foreground dark:text-muted-foreground dark:group-hover:text-foreground">
				~
			</span>
			<span>{command}</span>
			<span className="ml-1 inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors group-hover:text-foreground dark:text-muted-foreground dark:group-hover:text-foreground">
				{copied ? "copied" : ""}
			</span>
		</button>
	);
}

function Crosshair({ className }: { className?: string }) {
	return (
		<svg
			className={`pointer-events-none absolute h-3.5 w-3.5 text-muted-foreground/70 animate-crosshair ${className}`}
			viewBox="0 0 14 14"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.2"
			aria-hidden="true"
		>
			<line x1="7" y1="0" x2="7" y2="14" />
			<line x1="0" y1="7" x2="14" y2="7" />
		</svg>
	);
}

export default function HomePage() {
	return (
		<HomeLayout {...baseOptions()}>
			{/* 1. HERO SECTION - FILESYSTEM / INODE MATRIX */}
			<div className="relative flex min-h-[calc(100dvh-3.5rem)] w-full flex-col justify-center overflow-hidden bg-background text-foreground px-4 sm:px-6 lg:px-8 py-6 md:py-8 transition-colors duration-300">
				{/* Ambient technical grid texture */}
				<div
					className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[24px_24px] opacity-40 mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] -z-10"
					aria-hidden="true"
				/>

				{/* Contained Hero Inode Box */}
				<div className="relative mx-auto w-full max-w-5xl">
					{/* Outer animated drafting guidelines that intersect at outer corners */}
					<div className="pointer-events-none absolute -left-6 -right-6 top-0 border-t border-dashed border-border/70 origin-center animate-line-x sm:-left-10 sm:-right-10" />
					<div className="pointer-events-none absolute -left-6 -right-6 bottom-0 border-b border-dashed border-border/70 origin-center animate-line-x sm:-left-10 sm:-right-10" />
					<div className="pointer-events-none absolute left-0 -top-6 -bottom-6 border-l border-dashed border-border/70 origin-top animate-line-y sm:-top-8 sm:-bottom-8" />
					<div className="pointer-events-none absolute right-0 -top-6 -bottom-6 border-r border-dashed border-border/70 origin-top animate-line-y sm:-top-8 sm:-bottom-8" />

					{/* Outer corner intersection crosshairs */}
					<Crosshair className="-top-1.75 -left-1.75" />
					<Crosshair className="-top-1.75 -right-1.75" />
					<Crosshair className="-bottom-1.75 -left-1.75" />
					<Crosshair className="-bottom-1.75 -right-1.75" />

					{/* Top Inode Specification / Breadcrumb Header Bar */}
					<div className="relative flex items-center justify-between border-x border-t border-border border-dashed px-4 py-2 font-mono text-xs text-muted-foreground backdrop-blur-xs sm:px-6">
						<div className="flex items-center gap-2">
							<span className="font-semibold font-mono text-foreground">
								{"~"} <code>ls .memofs/</code>
							</span>
						</div>
					</div>

					{/* Main Content Box with Precision Grid */}
					<div className="relative border border-border border-dashed">
						{/* Headline Section */}
						<div className="relative px-4 py-8 text-center sm:px-8 sm:py-10 md:py-12">
							<h1 className="mx-auto max-w-4xl text-balance text-3xl font-bold font-sans tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
								The File-First Memory Runtime for AI Agents
							</h1>
						</div>

						{/* Mid Dashed Animated Divider with Intersecting Crosshairs */}
						<div className="relative border-t border-dashed border-border">
							<div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border origin-left animate-line-x" />
							<Crosshair className="-top-1.75 -left-1.75" />
							<Crosshair className="-top-1.75 -right-1.75" />
							<Crosshair className="-top-1.75 left-[calc(25%-7px)] hidden md:block" />
							<Crosshair className="-top-1.75 right-[calc(25%-7px)] hidden md:block" />
						</div>

						{/* Subtitle Section */}
						<div className="px-4 py-5 text-center sm:px-8 sm:py-6 md:py-7">
							<p className="mx-auto max-w-2xl text-balance md:text-lg text-muted-foreground leading-relaxed font-medium">
								Store decisions, facts, and context as simple markdown files in
								your project —{" "}
								<strong className="text-foreground font-semibold">
									versioned, portable, and always there when the next session
									starts
								</strong>
								.
							</p>
						</div>

						{/* Lower Dashed Animated Divider with Intersecting Crosshairs */}
						<div className="relative border-t border-dashed border-border">
							<div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border origin-right animate-line-x" />
							<Crosshair className="-top-1.75 -left-1.75" />
							<Crosshair className="-top-1.75 -right-1.75" />
							<Crosshair className="-top-1.75 left-[calc(25%-7px)] hidden md:block" />
							<Crosshair className="-top-1.75 right-[calc(25%-7px)] hidden md:block" />
						</div>

						{/* CTA & CLI Section with Animated Vertical Intersecting Dividers */}
						<div className="relative grid grid-cols-12 divide-y divide-border md:divide-y-0">
							{/* Vertical animated dashed divider lines */}
							<div className="hidden md:block pointer-events-none absolute top-0 bottom-0 left-1/4 border-l border-dashed border-border origin-top animate-line-y" />
							<div className="hidden md:block pointer-events-none absolute top-0 bottom-0 right-1/4 border-r border-dashed border-border origin-top animate-line-y" />

							{/* Left technical spec column */}
							<div className="hidden md:flex md:col-span-3 flex-col justify-between p-4 font-mono text-xs text-muted-foreground/70">
								<div className="text-muted-foreground/40 font-mono text-[10px]">
									cursor: cur_0x4f02a9
								</div>
							</div>

							{/* Center Action Column */}
							<div className="col-span-12 md:col-span-6 px-4 py-6 text-center sm:px-6 sm:py-8">
								<div className="flex flex-wrap items-center justify-center gap-3">
									<Button
										asChild
										size="lg"
										className="rounded-none font-bold tracking-wide"
									>
										<Link to={ROUTES.introduction}>Get Started</Link>
									</Button>
									<Button
										asChild
										variant="secondary"
										size="lg"
										className="rounded-none font-bold tracking-wide"
									>
										<Link to="/#features">Features &rarr;</Link>
									</Button>
								</div>

								<div className="flex justify-center mt-2">
									<CommandPrompt />
								</div>
							</div>

							{/* Right technical spec column */}
							<div className="hidden md:flex md:col-span-3 flex-col justify-between p-4 font-mono text-xs text-muted-foreground/70 text-right">
								<div className="text-muted-foreground/40 font-mono text-[10px]">
									digest: sha256
								</div>
							</div>
						</div>
					</div>

					{/* Bottom Partition Footer Bar */}
					<div className="relative flex items-center justify-end border-x border-b border-dashed border-border px-4 py-2 font-mono text-xs text-muted-foreground/70 backdrop-blur-xs sm:px-6">
						<div className="flex items-center gap-3">
							<span>[mount: file-first]</span>
						</div>
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
