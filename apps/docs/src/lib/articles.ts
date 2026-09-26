import type { ArticleCardData } from "../components/articles/article-card";
import { calculateReadingTime } from "../components/articles/reading-time";

/** Structural minimum of a fumadocs article page used by the mappers below. */
interface ArticlePageData {
	title: string;
	description?: string;
	category: string;
	publishedAt: string;
	authorName: string;
	authorRole: string;
	authorInitials: string;
	authorAvatarUrl: string;
	featured: boolean;
	tags: string[];
	getText: (mode: "processed" | "raw") => Promise<string>;
}

interface ArticlePageLike {
	slugs: string[];
	data: ArticlePageData;
}

/** Normalizes a category label for comparison ("Guides" → "guide"). */
export function normalizeCat(c: string): string {
	const lower = c.toLowerCase();
	if (lower === "guides") return "guide";
	if (lower === "announcements") return "announcement";
	return lower;
}

/**
 * Reads a page's compiled markdown for reading-time calculation, falling
 * back to raw text. Requires `includeProcessedMarkdown: true` in the
 * collection config for the fast path.
 */
export async function getPageRawContent(
	page: ArticlePageLike,
): Promise<string> {
	try {
		return await page.data.getText("processed");
	} catch {
		try {
			return await page.data.getText("raw");
		} catch {
			return "";
		}
	}
}

/**
 * Maps a fumadocs article page to card data. Frontmatter defaults come from
 * the collection zod schema, so no `|| fallback` literals live here.
 */
export function toArticleCardData(
	slug: string,
	page: ArticlePageLike,
	readingTimeMinutes: number,
): ArticleCardData {
	const data = page.data;
	return {
		slug,
		title: data.title,
		description: data.description,
		category: data.category,
		publishedAt: data.publishedAt,
		readingTimeMinutes,
		authorName: data.authorName,
		authorRole: data.authorRole,
		authorInitials: data.authorInitials,
		authorAvatarUrl: data.authorAvatarUrl,
		featured: data.featured,
		tags: data.tags,
	};
}

/** Convenience: content + mapping in one step for index-style loaders. */
export async function toArticleCard(
	page: ArticlePageLike,
	slug: string = page.slugs[0] ?? "",
): Promise<ArticleCardData> {
	const rawContent = await getPageRawContent(page);
	return toArticleCardData(slug, page, calculateReadingTime(rawContent));
}

/** Newest-first sort shared by the article index and detail loaders. */
export function sortArticlesNewestFirst(articles: ArticleCardData[]): void {
	articles.sort(
		(a, b) =>
			new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
	);
}
