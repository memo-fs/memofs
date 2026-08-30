import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

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
