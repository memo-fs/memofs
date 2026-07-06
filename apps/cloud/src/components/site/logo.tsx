import { cn } from "~/lib/utils";

/**
 * Memo FS brand mark.
 *
 * Derived from the TekBreed identity (the `< >` brackets + blue→green palette),
 * but with the parent's DNA helix replaced by stacked memory layers — Memo FS is
 * layered memory. Same glyph as the shared `logo.svg` / `favicon.ico` so the
 * brand reads consistently across the docs and cloud apps. The brighter brand
 * variants (#4fb2f3 / #5bd473) stay legible on both light and dark surfaces.
 *
 * `Wordmark` pairs the glyph with the mono "Memo FS" / "Cloud" treatment.
 */

const BRAND_PRIMARY = "currentColor";
const BRAND_SECONDARY = "var(--muted-foreground)";

export function LogoMark({
	className,
	size = 30,
}: {
	className?: string;
	size?: number;
}) {
	const gid = "memofs-logo-grad";
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			fill="none"
			className={cn("shrink-0", className)}
			role="img"
			aria-label="Memo FS"
		>
			<defs>
				<linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
					<stop stopColor={BRAND_PRIMARY} />
					<stop offset="1" stopColor={BRAND_SECONDARY} />
				</linearGradient>
			</defs>
			<g strokeLinecap="round" strokeLinejoin="round" fill="none">
				<polyline
					points="25,25 5,50 25,75"
					stroke={BRAND_PRIMARY}
					strokeWidth="6"
				/>
				<polyline
					points="75,25 95,50 75,75"
					stroke={BRAND_SECONDARY}
					strokeWidth="6"
				/>
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
				"font-mono text-base font-bold tracking-tight text-foreground",
				className,
			)}
		>
			Memo FS
			{suffix ? (
				<span className="text-xs font-normal text-muted-foreground ml-1 uppercase tracking-wider">
					{" "}
					{suffix}
				</span>
			) : null}
		</span>
	);
}

export function Logo({ className }: { className?: string }) {
	return (
		<span className={cn("flex items-center gap-2.5", className)}>
			<LogoMark size={30} />
			<Wordmark />
		</span>
	);
}
