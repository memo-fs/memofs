import { Link } from "react-router";
import { cn } from "../../lib/utils";
import { ArticleVisualBanner } from "./article-visual-banner";

export interface ArticleCardData {
	slug: string;
	title: string;
	description?: string;
	category: string;
	publishedAt: string;
	readingTimeMinutes: number;
	authorName: string;
	authorRole?: string;
	authorInitials?: string;
	authorAvatarUrl?: string;
	featured?: boolean;
	tags?: string[];
}

interface ArticleCardProps {
	article: ArticleCardData;
	featured?: boolean;
	className?: string;
}

/**
 * Editorial Article Card with visual banner, category pill,
 * title, and author/date footer.
 */
export function ArticleCard({
	article,
	featured = false,
	className,
}: ArticleCardProps) {
	const categoryColorClass = getCategoryColor(article.category);

	if (featured) {
		return <FeaturedHeroCard article={article} className={className} />;
	}

	return (
		<Link
			to={`/articles/${article.slug}`}
			className={cn(
				"group relative flex flex-col justify-between overflow-hidden border border-border/80 bg-card/50 transition-colors duration-300",
				"hover:border-primary/50 hover:bg-card/80",
				className,
			)}
		>
			{/* Top Compact Visual Banner */}
			<ArticleVisualBanner category={article.category} title={article.title} />

			{/* Card Body */}
			<div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
				<div>
					{/* Category Label */}
					<span
						className={cn(
							"font-heading font-semibold text-[10px] uppercase tracking-[0.14em]",
							categoryColorClass,
						)}
					>
						{article.category}
					</span>

					{/* Title */}
					<h3 className="mt-1.5 font-bold font-heading text-base text-foreground leading-snug tracking-tight transition-colors group-hover:text-primary">
						{article.title}
					</h3>
				</div>

				{/* Author & Date Footer */}
				<div className="mt-4 flex items-center justify-between border-border/30 border-t pt-3">
					<div className="flex items-center gap-2">
						<div className="flex size-5.5 shrink-0 items-center justify-center overflow-hidden border border-border/80 bg-secondary font-mono font-semibold text-[9px] text-foreground">
							{article.authorAvatarUrl ? (
								<img
									src={article.authorAvatarUrl}
									alt={article.authorName}
									className="size-full object-cover"
								/>
							) : (
								article.authorInitials ||
								article.authorName.slice(0, 2).toUpperCase()
							)}
						</div>
						<span className="font-mono text-[11px] text-muted-foreground">
							{article.authorName}
						</span>
						<span className="text-border text-xs">•</span>
						<span className="font-mono text-[11px] text-muted-foreground/80">
							{article.publishedAt}
						</span>
					</div>

					<span className="font-mono text-[11px] text-muted-foreground/80">
						{article.readingTimeMinutes}m
					</span>
				</div>
			</div>
		</Link>
	);
}

/**
 * 2-Column Featured Hero Card.
 */
function FeaturedHeroCard({
	article,
	className,
}: {
	article: ArticleCardData;
	className?: string;
}) {
	const categoryColorClass = getCategoryColor(article.category);

	return (
		<Link
			to={`/articles/${article.slug}`}
			className={cn(
				"group relative flex flex-col justify-between overflow-hidden border border-border bg-card/60 transition-colors duration-300",
				"hover:border-primary/50 hover:bg-card/90",
				className,
			)}
		>
			{/* Top Large Visual Banner */}
			<ArticleVisualBanner
				category={article.category}
				title={article.title}
				featured={true}
			/>

			{/* Body Content */}
			<div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
				<div>
					{/* Category */}
					<span
						className={cn(
							"font-heading font-semibold text-[11px] uppercase tracking-[0.16em]",
							categoryColorClass,
						)}
					>
						{article.category}
					</span>

					{/* Title */}
					<h2 className="mt-2 font-bold font-heading text-foreground text-lg leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-xl">
						{article.title}
					</h2>
				</div>

				{/* Author & Date Footer */}
				<div className="mt-5 flex items-center justify-between border-border/40 border-t pt-3.5">
					<div className="flex items-center gap-2.5">
						<div className="flex size-6 shrink-0 items-center justify-center overflow-hidden border border-border bg-secondary font-mono font-semibold text-[10px] text-foreground">
							{article.authorAvatarUrl ? (
								<img
									src={article.authorAvatarUrl}
									alt={article.authorName}
									className="size-full object-cover"
								/>
							) : (
								article.authorInitials ||
								article.authorName.slice(0, 2).toUpperCase()
							)}
						</div>
						<div className="flex items-center gap-2">
							<span className="font-medium font-mono text-foreground text-xs">
								{article.authorName}
							</span>
							<span className="text-border">•</span>
							<span className="font-mono text-muted-foreground text-xs">
								{article.publishedAt}
							</span>
						</div>
					</div>

					<span className="font-mono text-muted-foreground text-xs">
						{article.readingTimeMinutes} min read
					</span>
				</div>
			</div>
		</Link>
	);
}

function getCategoryColor(category: string): string {
	switch (category.toLowerCase()) {
		case "architecture":
			return "text-accent-gold";
		case "engineering":
			return "text-sky-400";
		case "guide":
		case "guides":
			return "text-emerald-400";
		case "announcement":
		case "announcements":
			return "text-violet-400";
		default:
			return "text-rose-400";
	}
}
