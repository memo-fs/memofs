import { cn } from "~/lib/utils";

/**
 * Memo FS brand mark.
 *
 * Three stacked isometric memory layers with data-burst accent dots —
 * matches `public/logo.svg` / `assets/images/logo.svg`. Uses `currentColor`
 * for the top layer and a gradient to `--muted-foreground` for the lower
 * layers so the glyph adapts to any context (header, sidebar, footer).
 */

const LAYER_TOP = "currentColor";
const LAYER_BTM = "var(--muted-foreground)";

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
					<stop stopColor={LAYER_TOP} />
					<stop offset="1" stopColor={LAYER_BTM} />
				</linearGradient>
			</defs>
			{/* Bottom layer */}
			<polygon fill={LAYER_BTM} points="50,82 12,62 50,45 88,62" />
			{/* Middle layer */}
			<polygon fill={`url(#${gid})`} points="50,63 12,43 50,26 88,43" />
			{/* Top layer */}
			<polygon fill={LAYER_TOP} points="50,45 12,25 50,8 88,25" />
			{/* Data burst accent */}
			<circle fill={LAYER_TOP} cx="50" cy="23" r="3.5" />
			<circle fill={LAYER_TOP} cx="35" cy="30" r="1.5" opacity="0.6" />
			<circle fill={LAYER_TOP} cx="65" cy="30" r="1.5" opacity="0.6" />
			<circle fill={LAYER_TOP} cx="50" cy="37" r="1.5" opacity="0.6" />
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
