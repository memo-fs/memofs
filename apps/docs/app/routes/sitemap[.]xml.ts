import { source } from "~/lib/source";

export function loader() {
	const baseUrl = "https://docs.memofs.dev";
	const pages = source.getPages();

	const urls = [
		{ loc: `${baseUrl}/`, changefreq: "daily", priority: "1.0" },
		{ loc: `${baseUrl}/docs`, changefreq: "daily", priority: "0.9" },
		{ loc: `${baseUrl}/cookbooks`, changefreq: "daily", priority: "0.9" },
		{ loc: `${baseUrl}/changelog`, changefreq: "weekly", priority: "0.8" },
		{ loc: `${baseUrl}/llms.txt`, changefreq: "weekly", priority: "0.6" },
		{ loc: `${baseUrl}/llms-full.txt`, changefreq: "weekly", priority: "0.6" },
		...pages
			.filter((page) => page.url !== "/docs")
			.map((page) => ({
				loc: `${baseUrl}${page.url}`,
				changefreq: "weekly",
				priority: page.url.startsWith("/docs/introduction")
					? "0.9"
					: page.url.startsWith("/docs/core")
						? "0.8"
						: "0.7",
			})),
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(url) => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
	)
	.join("\n")}
</urlset>`;

	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
		},
	});
}
