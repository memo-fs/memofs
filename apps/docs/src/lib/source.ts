import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/plugins/lucide-icons";
import { pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";

export const docs = defineDocs({
	dir: "content/docs",
	docs: {
		postprocess: {
			includeProcessedMarkdown: true,
		},
	},
});

export const source = loader({
	baseUrl: "/docs",
	source: docs.toFumadocsSource(),
	plugins: [lucideIconsPlugin()],
});

export const articlesDocs = defineDocs({
	dir: "content/articles",
	docs: {
		// Mirror of the schema in source.config.ts so page.data is typed
		// with the custom article frontmatter fields.
		schema: pageSchema.extend({
			category: z.string().default("Engineering"),
			publishedAt: z.string().default("2026-08-20"),
			authorName: z.string().default("Christopher S. Aondona"),
			authorRole: z.string().default("Founder & Engine Lead"),
			authorInitials: z.string().default("CS"),
			authorHandle: z.string().optional(),
			authorAvatarUrl: z
				.string()
				.default("https://github.com/christophersesugh.png"),
			featured: z.boolean().default(false),
			tags: z.array(z.string()).default([]),
		}),
		postprocess: {
			includeProcessedMarkdown: true,
		},
	},
});

export const articles = loader({
	baseUrl: "/articles",
	source: articlesDocs.toFumadocsSource(),
});

export const manifestoDocs = defineDocs({
	dir: "content/manifesto",
	docs: {
		postprocess: {
			includeProcessedMarkdown: true,
		},
	},
});

export const manifesto = loader({
	baseUrl: "/manifesto",
	source: manifestoDocs.toFumadocsSource(),
});

export function getPageImageUrl(page: (typeof source)["$inferPage"]) {
	const segments = [...page.slugs, "image.webp"];
	return {
		segments,
		url: `/${[page.locale, "og", "docs", ...segments].filter(Boolean).join("/")}`,
	};
}

/**
 * Normalizes a raw route slug string into a clean segment array by stripping
 * extensions (.data, .mdx, .md, trailing .webp) and filtering out empty segments.
 */
export function parseDocSlugs(
	rawSlug: string | undefined,
	options?: { stripTrailingImage?: boolean },
): string[] {
	let slug = rawSlug ?? "";
	if (slug.endsWith(".data")) {
		slug = slug.slice(0, -5);
	}
	if (slug.endsWith(".mdx")) {
		slug = slug.slice(0, -4);
	} else if (slug.endsWith(".md")) {
		slug = slug.slice(0, -3);
	}

	let segments = slug.split("/").filter((v) => v.length > 0 && v !== ".data");
	if (options?.stripTrailingImage && segments.at(-1)?.endsWith(".webp")) {
		segments = segments.slice(0, -1);
	}
	return segments;
}

/**
 * Resolves a doc page from a raw slug parameter. Throws 404 Response if not found.
 */
export function resolveDocPage(
	rawSlug: string | undefined,
	options?: { stripTrailingImage?: boolean },
) {
	const slugs = parseDocSlugs(rawSlug, options);
	const page = source.getPage(slugs);
	if (!page) {
		throw new Response("Not found", { status: 404 });
	}
	return { page, slugs };
}
