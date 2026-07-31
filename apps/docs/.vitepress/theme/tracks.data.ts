import { createContentLoader } from "vitepress";

const loader = createContentLoader("learn/tracks/**/index.md", {
	includeSrc: false,
	render: false,
	transform(rawData) {
		return rawData
			.filter(
				(item) =>
					item.url !== "/learn/tracks/" &&
					item.url !== "/learn/tracks/index.html",
			)
			.sort((a, b) => {
				const aDate = a.frontmatter.date
					? new Date(a.frontmatter.date)
					: new Date();
				const bDate = b.frontmatter.date
					? new Date(b.frontmatter.date)
					: new Date();
				return +bDate - +aDate;
			});
	},
});

export default loader as ReturnType<typeof createContentLoader>;
