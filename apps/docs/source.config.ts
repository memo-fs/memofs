import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { articleFrontmatterSchema } from "./src/lib/article-schema";

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
		// default pageSchema ($strip) — the shared schema keeps these fields.
		schema: articleFrontmatterSchema,
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
