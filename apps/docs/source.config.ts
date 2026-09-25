import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { z } from "zod";

export default defineConfig({
	mdxOptions: {
		remarkPlugins: (v) => [remarkMath, remarkMdxMermaid, ...v],
		rehypePlugins: (v) => [rehypeKatex, ...v],
	},
});

export const { docs, meta } = defineDocs({
	dir: "content/docs",
	docs: {
		postprocess: {
			includeProcessedMarkdown: true,
		},
	},
});

export const { docs: articlesDocs } = defineDocs({
	dir: "content/articles",
	docs: {
		// Custom frontmatter (category, featured, ...) is stripped by the
		// default pageSchema ($strip), so extend it to keep article fields.
		// Keep in sync with src/lib/source.ts.
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

export const { docs: manifestoDocs } = defineDocs({
	dir: "content/manifesto",
	docs: {
		postprocess: {
			includeProcessedMarkdown: true,
		},
	},
});
