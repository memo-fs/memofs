import { createContentLoader } from "vitepress";

const loader = createContentLoader("learn/cookbooks/*.md", {
	includeSrc: false,
	render: false,
	transform(rawData) {
		return rawData
			.filter(
				(item) =>
					!item.url.endsWith("/cookbooks/") &&
					!item.url.endsWith("/cookbooks/index.html"),
			)
			.sort((a, b) =>
				(a.url || "").localeCompare(b.url || "", undefined, {
					sensitivity: "base",
				}),
			);
	},
});

// Prevent leaking VitePress internal types
export default loader as ReturnType<typeof createContentLoader>;