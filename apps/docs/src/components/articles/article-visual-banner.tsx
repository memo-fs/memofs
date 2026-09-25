import { cn } from "../../lib/utils";
import { LogoMark } from "./logo";

interface ArticleVisualBannerProps {
	category: string;
	title?: string;
	className?: string;
	featured?: boolean;
}

/**
 * Technical graphical banner thumbnail for article cards.
 */
export function ArticleVisualBanner({
	category,
	title: _title,
	className,
	featured = false,
}: ArticleVisualBannerProps) {
	const theme = getCategoryVisualTheme(category);

	return (
		<div
			className={cn(
				"relative h-32 w-full overflow-hidden border-border/60 border-b bg-[#0B0C0E] sm:h-36",
				featured && "h-44 sm:h-52",
				className,
			)}
		>
			{/* Grid pattern background */}
			<div
				aria-hidden
				className="absolute inset-0 opacity-20"
				style={{
					backgroundImage:
						"linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
					backgroundSize: "24px 24px",
				}}
			/>

			{/* Ambient radial glow */}
			<div
				aria-hidden
				className={cn(
					"pointer-events-none absolute inset-0 opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-70",
					theme.glowClass,
				)}
			/>

			{/* Decorative technical vectors */}
			<svg
				className="absolute inset-0 size-full"
				viewBox="0 0 400 160"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
				preserveAspectRatio="xMidYMid slice"
			>
				<defs>
					<linearGradient
						id={`grad-${category.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
						x1="0"
						y1="0"
						x2="400"
						y2="160"
						gradientUnits="userSpaceOnUse"
					>
						<stop stopColor={theme.stopColor1} stopOpacity="0.8" />
						<stop offset="0.5" stopColor={theme.stopColor2} stopOpacity="0.4" />
						<stop offset="1" stopColor="transparent" stopOpacity="0" />
					</linearGradient>
				</defs>

				{/* Geometric orbital rings / wireframe lines */}
				<circle
					cx="200"
					cy="80"
					r="50"
					stroke={theme.strokeColor}
					strokeWidth="1"
					strokeDasharray="4 4"
					opacity="0.35"
				/>
				<circle
					cx="200"
					cy="80"
					r="80"
					stroke={theme.strokeColor}
					strokeWidth="1"
					opacity="0.15"
				/>

				{/* Tech connection paths */}
				<line
					x1="50"
					y1="80"
					x2="350"
					y2="80"
					stroke={`url(#grad-${category.toLowerCase().replace(/[^a-z0-9]/g, "-")})`}
					strokeWidth="1"
				/>
				<line
					x1="200"
					y1="10"
					x2="200"
					y2="150"
					stroke={theme.strokeColor}
					strokeWidth="1"
					strokeDasharray="2 4"
					opacity="0.25"
				/>
			</svg>

			{/* Central visual motif */}
			<div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
				<div
					className={cn(
						"flex size-11 items-center justify-center border bg-card/80 shadow-2xl backdrop-blur-md transition-transform duration-300 group-hover:scale-105",
						theme.badgeBorder,
					)}
				>
					<LogoMark size={24} className={theme.logoClass} />
				</div>

				{featured && (
					<span
						className={cn(
							"mt-2 font-mono font-semibold text-[10px] uppercase tracking-[0.18em]",
							theme.textColor,
						)}
					>
						{category}
					</span>
				)}
			</div>

			{/* Corner accents */}
			<div className="absolute top-2.5 left-3 font-mono text-[9px] text-muted-foreground/60 uppercase tracking-widest">
				{`MEMOFS // ${category}`}
			</div>
		</div>
	);
}

/**
 * NPM-style radar wireframe hero banner for Article details page.
 */
export function NpmArticleHeroGraphic({
	category,
	className,
}: {
	category: string;
	className?: string;
}) {
	const theme = getNpmCategoryTheme(category);

	return (
		<div
			className={cn(
				"relative mx-auto mt-10 h-56 w-full max-w-4xl overflow-hidden border-border/80 border-b bg-[#07080A] sm:h-72",
				className,
			)}
		>
			{/* Wireframe Coordinate Grid with Category Color */}
			<div
				className="absolute inset-0"
				style={{
					backgroundImage: `
						linear-gradient(to right, ${theme.gridColor} 1px, transparent 1px),
						linear-gradient(to bottom, ${theme.gridColor} 1px, transparent 1px)
					`,
					backgroundSize: "32px 32px",
					maskImage:
						"radial-gradient(ellipse at 50% 100%, black 50%, rgba(0,0,0,0.4) 75%, transparent 100%)",
					WebkitMaskImage:
						"radial-gradient(ellipse at 50% 100%, black 50%, rgba(0,0,0,0.4) 75%, transparent 100%)",
				}}
			/>

			{/* Category-colored ambient radial glow radiating from dome */}
			<div
				aria-hidden
				className={cn(
					"pointer-events-none absolute -bottom-16 left-1/2 h-64 w-125 -translate-x-1/2 rounded-full opacity-60 blur-3xl",
					theme.glowClass,
				)}
			/>

			{/* Central NPM Radar Dome Silhouette */}
			<div className="absolute inset-0 flex items-end justify-center">
				<div
					className={cn(
						"relative flex h-36 w-72 items-center justify-center rounded-t-full border-t border-r border-l sm:h-48 sm:w-96",
						theme.domeBorder,
						theme.domeBg,
					)}
				>
					{/* Glowing laser radar dot on arc perimeter */}
					<span
						className={cn(
							"absolute top-5 right-10 size-2 rounded-full",
							theme.dotClass,
						)}
					/>

					{/* Inner radar ring */}
					<div
						className={cn(
							"absolute bottom-0 size-48 rounded-t-full border-t border-r border-l sm:size-64",
							theme.innerRingBorder,
						)}
					/>

					{/* MemoFS Emblem Silhouette */}
					<div className="relative z-10 -mb-2 flex flex-col items-center justify-center">
						<LogoMark size={56} className={cn("opacity-90", theme.logoColor)} />
					</div>
				</div>
			</div>
		</div>
	);
}

function getCategoryVisualTheme(category: string) {
	switch (category.toLowerCase()) {
		case "architecture":
			return {
				glowClass: "bg-accent-gold/20",
				stopColor1: "oklch(0.77 0.17 70)",
				stopColor2: "oklch(0.65 0.15 80)",
				strokeColor: "oklch(0.77 0.17 70 / 0.4)",
				badgeBorder: "border-accent-gold/40 shadow-accent-gold/10",
				logoClass: "text-accent-gold",
				textColor: "text-accent-gold",
			};
		case "engineering":
			return {
				glowClass: "bg-sky-500/20",
				stopColor1: "oklch(0.78 0.16 205)",
				stopColor2: "oklch(0.65 0.18 240)",
				strokeColor: "oklch(0.78 0.16 205 / 0.4)",
				badgeBorder: "border-sky-500/40 shadow-sky-500/10",
				logoClass: "text-sky-400",
				textColor: "text-sky-400",
			};
		case "guide":
		case "guides":
			return {
				glowClass: "bg-emerald-500/20",
				stopColor1: "oklch(0.75 0.18 150)",
				stopColor2: "oklch(0.6 0.15 160)",
				strokeColor: "oklch(0.75 0.18 150 / 0.4)",
				badgeBorder: "border-emerald-500/40 shadow-emerald-500/10",
				logoClass: "text-emerald-400",
				textColor: "text-emerald-400",
			};
		case "announcement":
		case "announcements":
			return {
				glowClass: "bg-violet-500/20",
				stopColor1: "oklch(0.72 0.19 295)",
				stopColor2: "oklch(0.58 0.18 310)",
				strokeColor: "oklch(0.72 0.19 295 / 0.4)",
				badgeBorder: "border-violet-500/40 shadow-violet-500/10",
				logoClass: "text-violet-400",
				textColor: "text-violet-400",
			};
		default:
			return {
				glowClass: "bg-rose-500/20",
				stopColor1: "oklch(0.7 0.18 15)",
				stopColor2: "oklch(0.55 0.15 25)",
				strokeColor: "oklch(0.7 0.18 15 / 0.4)",
				badgeBorder: "border-rose-500/40 shadow-rose-500/10",
				logoClass: "text-rose-400",
				textColor: "text-rose-400",
			};
	}
}

function getNpmCategoryTheme(category: string) {
	switch (category.toLowerCase()) {
		case "architecture":
			return {
				gridColor: "rgba(245, 158, 11, 0.16)",
				glowClass: "bg-amber-500/25",
				domeBorder: "border-amber-500/40",
				domeBg:
					"bg-gradient-to-t from-amber-950/60 via-amber-950/20 to-transparent",
				dotClass: "bg-amber-400 shadow-[0_0_12px_3px_rgba(251,191,36,0.9)]",
				innerRingBorder: "border-amber-500/20",
				logoColor: "text-amber-400",
			};
		case "engineering":
			return {
				gridColor: "rgba(14, 165, 233, 0.16)",
				glowClass: "bg-sky-500/25",
				domeBorder: "border-sky-500/40",
				domeBg:
					"bg-gradient-to-t from-sky-950/60 via-sky-950/20 to-transparent",
				dotClass: "bg-sky-400 shadow-[0_0_12px_3px_rgba(56,189,248,0.9)]",
				innerRingBorder: "border-sky-500/20",
				logoColor: "text-sky-400",
			};
		case "guide":
		case "guides":
			return {
				gridColor: "rgba(16, 185, 129, 0.16)",
				glowClass: "bg-emerald-500/25",
				domeBorder: "border-emerald-500/40",
				domeBg:
					"bg-gradient-to-t from-emerald-950/60 via-emerald-950/20 to-transparent",
				dotClass: "bg-emerald-400 shadow-[0_0_12px_3px_rgba(52,211,153,0.9)]",
				innerRingBorder: "border-emerald-500/20",
				logoColor: "text-emerald-400",
			};
		case "announcement":
		case "announcements":
			return {
				gridColor: "rgba(139, 92, 246, 0.16)",
				glowClass: "bg-violet-500/25",
				domeBorder: "border-violet-500/40",
				domeBg:
					"bg-gradient-to-t from-violet-950/60 via-violet-950/20 to-transparent",
				dotClass: "bg-violet-400 shadow-[0_0_12px_3px_rgba(167,139,250,0.9)]",
				innerRingBorder: "border-violet-500/20",
				logoColor: "text-violet-400",
			};
		default:
			return {
				gridColor: "rgba(244, 63, 94, 0.16)",
				glowClass: "bg-rose-500/25",
				domeBorder: "border-rose-500/40",
				domeBg:
					"bg-gradient-to-t from-rose-950/60 via-rose-950/20 to-transparent",
				dotClass: "bg-rose-400 shadow-[0_0_12px_3px_rgba(244,63,94,0.9)]",
				innerRingBorder: "border-rose-500/20",
				logoColor: "text-rose-400",
			};
	}
}
