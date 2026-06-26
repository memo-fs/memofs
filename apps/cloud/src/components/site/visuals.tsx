import type * as React from "react";
import { cn } from "~/lib/utils";

/**
 * Section container for standard layout structure.
 */

/**
 * Section — the standard vertical-rhythm + max-width container for every public
 * page. Centralizes spacing so every section reads as part of one system.
 */
export function Section({
	as: As = "section",
	className,
	children,
	...props
}: React.ComponentProps<"section"> & {
	as?: React.ElementType;
}) {
	return (
		<As
			className={cn(
				"relative mx-auto w-full max-w-6xl px-6 sm:px-8",
				className,
			)}
			{...props}
		>
			{children}
		</As>
	);
}

/**
 * SectionDivider — the fading hairline rule used between public-page sections.
 * Centralized so the treatment (max-width + edge-fading gradient) never drifts
 * between sections.
 */
export function SectionDivider({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"mx-auto h-px max-w-6xl bg-linear-to-r from-transparent via-border to-transparent",
				className,
			)}
		/>
	);
}
