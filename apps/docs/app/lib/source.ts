import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/plugins/lucide-icons";
import { defineDocs } from "fumadocs-mdx/macro";

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

export function getPageImageUrl(page: (typeof source)["$inferPage"]) {
	const segments = [...page.slugs, "image.webp"];
	return {
		segments,
		url: `/${[page.locale, "og", "docs", ...segments].filter(Boolean).join("/")}`,
	};
}
