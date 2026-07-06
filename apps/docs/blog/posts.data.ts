import { createContentLoader } from "vitepress";

/**
 * Blog post index — built at compile time from every `blog/*.md` file's
 * frontmatter (plus a word-count reading estimate). This is the single source
 * of truth for the blog landing grid AND the per-post header/footer chrome, so
 * adding a post is just: drop a markdown file with frontmatter. No manual list
 * edits, no duplicated metadata.
 *
 * Usage: `import { data as posts } from "./posts.data"` (or with a relative
 * path from theme components).
 */

export interface BlogPost {
	url: string;
	title: string;
	description: string;
	author: string;
	tags: string[];
	cover: string | null;
	/** Human-readable date, e.g. "January 15, 2026". */
	date: string;
	/** Epoch millis for sorting. */
	dateTime: number;
	/** Reading estimate, e.g. "4 min read". */
	readingTime: string;
}

declare const data: BlogPost[];

export { data };

const WORDS_PER_MINUTE = 220;

function formatDate(raw: string | number | Date | undefined): {
	date: string;
	dateTime: number;
} {
	const d = raw ? new Date(raw) : new Date(0);
	return {
		dateTime: d.getTime(),
		date: d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		}),
	};
}

function readingTime(src: string | undefined): string {
	if (!src) return "1 min read";
	// Strip frontmatter + code fences so the estimate reflects prose.
	const prose = src
		.replace(/^---[\s\S]*?---/, "")
		.replace(/```[\s\S]*?```/g, " ");
	const words = prose.split(/\s+/).filter(Boolean).length;
	return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
}

export default createContentLoader("blog/*.md", {
	includeSrc: true,
	transform(raw): BlogPost[] {
		return raw
			.filter((page) => !page.url.endsWith("/blog/"))
			.map(({ url, frontmatter, src }) => {
				const { date, dateTime } = formatDate(frontmatter.date);
				return {
					url,
					title: frontmatter.title ?? "Untitled",
					description: frontmatter.description ?? "",
					author: frontmatter.author ?? "Memo FS",
					tags: frontmatter.tags ?? [],
					cover: frontmatter.cover ?? null,
					date,
					dateTime,
					readingTime: readingTime(src),
				};
			})
			.sort((a, b) => b.dateTime - a.dateTime);
	},
});
