import { cn } from "~/lib/utils";

/**
 * TekMemo brand mark.
 *
 * Derived from the TekBreed identity (the `< >` brackets + blue→green palette),
 * but with the parent's DNA helix replaced by stacked memory layers — TekMemo is
 * layered memory. Same glyph as the shared `logo.svg` / `favicon.ico` so the
 * brand reads consistently across the docs and cloud apps. The brighter brand
 * variants (#4fb2f3 / #5bd473) stay legible on both light and dark surfaces.
 *
 * `Wordmark` pairs the glyph with the mono "TekMemo" / "Cloud" treatment.
 */

const BRAND_BLUE = "#4fb2f3";
const BRAND_GREEN = "#5bd473";

export function LogoMark({
	className,
	size = 28,
}: {
	className?: string;
	size?: number;
}) {
	// Stable gradient id; identical defs across instances reference the same fill.
	const gid = "tekmemo-logo-grad";
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			fill="none"
			className={cn("shrink-0", className)}
			role="img"
			aria-label="TekMemo"
		>
			<defs>
				{/* Memory layers fade blue → green, tying the bracket colors together. */}
				<linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
					<stop stopColor={BRAND_BLUE} />
					<stop offset="1" stopColor={BRAND_GREEN} />
				</linearGradient>
			</defs>
			<g strokeLinecap="round" strokeLinejoin="round" fill="none">
				{/* Brackets — the TekBreed lineage (blue left, green right). */}
				<polyline
					points="25,25 5,50 25,75"
					stroke={BRAND_BLUE}
					strokeWidth="6"
				/>
				<polyline
					points="75,25 95,50 75,75"
					stroke={BRAND_GREEN}
					strokeWidth="6"
				/>
				{/* Isometric layered stack — the TekMemo mark (memory in layers). */}
				<g stroke={`url(#${gid})`} strokeWidth="6">
					<polygon points="50,28 66,37 50,46 34,37" />
					<polyline points="34,45 50,54 66,45" />
					<polyline points="34,53 50,62 66,53" />
				</g>
			</g>
		</svg>
	);
}

export function Wordmark({
	className,
	suffix = "Cloud",
}: {
	className?: string;
	suffix?: string | null;
}) {
	return (
		<span
			className={cn(
				"font-mono text-sm font-semibold tracking-tight text-foreground",
				className,
			)}
		>
			TekMemo
			{suffix ? <span className="text-muted-foreground"> {suffix}</span> : null}
		</span>
	);
}

export function Logo({ className }: { className?: string }) {
	return (
		<span className={cn("flex items-center gap-2", className)}>
			<LogoMark size={26} />
			<Wordmark />
		</span>
	);
}
