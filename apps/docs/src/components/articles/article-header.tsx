import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { cn } from "../../lib/utils";
import { NpmArticleHeroGraphic } from "./article-visual-banner";

interface ArticleHeaderProps {
	title: string;
	category: string;
	publishedAt: string;
	readingTimeMinutes: number;
	backHref?: string;
	backLabel?: string;
}

/**
 * Centered Article Header with NPM-style Hero Graphic.
 */
export function ArticleHeader({
	title,
	category,
	publishedAt,
	readingTimeMinutes,
	backHref = "/articles",
	backLabel = "Back to Articles",
}: ArticleHeaderProps) {
	const badgeColor = getCategoryBadgeStyle(category);

	return (
		<header className="mx-auto max-w-4xl text-center">
			{/* Top Bar: Back Link */}
			<div className="flex items-center justify-between pb-8">
				<Link
					to={backHref}
					className="group inline-flex items-center gap-2 font-mono text-muted-foreground text-xs uppercase tracking-[0.16em] transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
					<span>{backLabel}</span>
				</Link>
			</div>

			{/* Centered Meta Section */}
			<div className="flex flex-col items-center gap-3.5">
				{/* Category Pill Badge */}
				<span
					className={cn(
						"px-3 py-1 font-mono font-semibold text-[11px] uppercase tracking-[0.2em]",
						badgeColor,
					)}
				>
					{category}
				</span>

				{/* Date & Reading Time */}
				<div className="font-mono text-muted-foreground text-xs uppercase tracking-[0.18em]">
					<span>{formatNPMDate(publishedAt)}</span>
					<span className="mx-2">•</span>
					<span>{readingTimeMinutes} Minute Read</span>
				</div>

				{/* Giant Centered Headline */}
				<h1 className="mx-auto max-w-3xl text-balance font-bold font-heading text-3xl text-foreground leading-[1.08] tracking-tight sm:text-5xl">
					{title}
				</h1>
			</div>

			{/* NPM-Style Hero Wireframe Graphic */}
			<NpmArticleHeroGraphic category={category} />
		</header>
	);
}

function formatNPMDate(dateStr: string): string {
	if (!dateStr) return "";
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return dateStr.toUpperCase();
	return d
		.toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		})
		.toUpperCase();
}

function getCategoryBadgeStyle(category: string): string {
	switch (category.toLowerCase()) {
		case "architecture":
			return "border border-amber-500/40 bg-amber-500/10 text-amber-400";
		case "engineering":
			return "border border-sky-500/40 bg-sky-500/10 text-sky-400";
		case "guide":
		case "guides":
			return "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
		case "announcement":
		case "announcements":
			return "border border-violet-500/40 bg-violet-500/10 text-violet-400";
		default:
			return "border border-rose-500/40 bg-rose-500/10 text-rose-400";
	}
}
