import { cn } from "../../lib/utils";

export function LogoMark({
	className,
	size = 30,
}: {
	className?: string;
	size?: number;
}) {
	const gid = "memofs-logo-grad";
	const LAYER_TOP = "currentColor";
	const LAYER_BTM =
		"var(--color-fd-muted-foreground, var(--muted-foreground, #94a3b8))";

	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			fill="none"
			className={cn("shrink-0", className)}
			role="img"
			aria-label="MemoFS"
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
