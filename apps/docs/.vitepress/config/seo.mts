import type { HeadConfig, TransformContext } from "vitepress";
import { resolveImageUrl, site } from "./site.mts";

/**
 * Normalizes relative markdown file path to clean canonical URL on docs.memofs.dev.
 */
export function getCanonicalUrl(relativePath: string): string {
	if (!relativePath || relativePath === "index.md") {
		return `${site.url}/`;
	}

	const clean = relativePath.replace(/\/index\.md$/, "/").replace(/\.md$/, "");

	const formatted = clean.startsWith("/") ? clean : `/${clean}`;
	return `${site.url}${formatted}`;
}

/**
 * Builds breadcrumbs hierarchy from relative path and page title.
 */
function buildBreadcrumbs(
	relativePath: string,
	pageTitle: string,
	canonicalUrl: string,
) {
	if (!relativePath || relativePath === "index.md") {
		return null;
	}

	const items: { name: string; item: string }[] = [
		{ name: "Docs", item: `${site.url}/` },
	];

	const parts = relativePath
		.replace(/(?:index)?\.md$/, "")
		.split("/")
		.filter(Boolean);

	if (parts.length > 1) {
		let currentPath = "";
		for (let i = 0; i < parts.length - 1; i++) {
			const segment = parts[i];
			if (!segment) continue;
			currentPath += `/${segment}`;
			const formattedName = segment
				.replace(/-/g, " ")
				.replace(/\b\w/g, (c) => c.toUpperCase());

			items.push({
				name: formattedName,
				item: `${site.url}${currentPath}/`,
			});
		}
	}

	items.push({
		name: pageTitle || "Documentation",
		item: canonicalUrl,
	});

	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((crumb, idx) => ({
			"@type": "ListItem",
			position: idx + 1,
			name: crumb.name,
			item: crumb.item,
		})),
	};
}

/**
 * Builds Schema.org JSON-LD structured data for the page.
 */
export function getPageJsonLd(
	ctx: TransformContext,
	canonicalUrl: string,
): Record<string, unknown>[] {
	const isHome =
		!ctx.pageData.relativePath || ctx.pageData.relativePath === "index.md";
	const title = ctx.pageData.title || ctx.title || site.title;
	const description =
		ctx.pageData.description || ctx.description || site.description;

	if (isHome) {
		return [
			{
				"@context": "https://schema.org",
				"@type": "WebSite",
				name: "MemoFS Documentation",
				url: site.url,
				description: site.description,
			},
			{
				"@context": "https://schema.org",
				"@type": "SoftwareApplication",
				name: "MemoFS",
				applicationCategory: "DeveloperApplication",
				operatingSystem: "macOS, Linux, Windows, Cloudflare Workers",
				url: site.url,
				description: site.description,
				softwareVersion: "1.0.0",
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "USD",
				},
				creator: {
					"@type": "Organization",
					name: "MemoFS",
					url: site.cloud,
					logo: `${site.url}/logo.svg`,
				},
			},
		];
	}

	const schemas: Record<string, unknown>[] = [];
	const breadcrumbs = buildBreadcrumbs(
		ctx.pageData.relativePath,
		title,
		canonicalUrl,
	);
	if (breadcrumbs) {
		schemas.push(breadcrumbs);
	}

	const isApi =
		ctx.pageData.relativePath.startsWith("api/") ||
		ctx.pageData.relativePath.startsWith("core/") ||
		ctx.pageData.relativePath.startsWith("server/") ||
		ctx.pageData.relativePath.startsWith("adapters/") ||
		ctx.pageData.relativePath.startsWith("cli/") ||
		ctx.pageData.relativePath.startsWith("mcp/") ||
		ctx.pageData.relativePath.startsWith("connectors/") ||
		ctx.pageData.relativePath.startsWith("tooling/");

	schemas.push({
		"@context": "https://schema.org",
		"@type": isApi ? "TechArticle" : "Article",
		headline: title,
		description,
		url: canonicalUrl,
		mainEntityOfPage: {
			"@type": "WebPage",
			"@id": canonicalUrl,
		},
		publisher: {
			"@type": "Organization",
			name: "MemoFS",
			url: site.cloud,
			logo: {
				"@type": "ImageObject",
				url: `${site.url}/logo.svg`,
			},
		},
	});

	return schemas;
}

/**
 * Dynamically computes all SEO and AEO tags for the current page during build/render.
 */
export function buildPageHead(ctx: TransformContext): HeadConfig[] {
	const resHead: HeadConfig[] = [...ctx.head];
	const canonicalUrl = getCanonicalUrl(ctx.pageData.relativePath);
	const title = ctx.pageData.title
		? `${ctx.pageData.title} | ${site.title}`
		: site.title;
	const description =
		ctx.pageData.description || ctx.description || site.description;

	// Update image URLs to absolute
	for (const tag of resHead) {
		if (tag[0] === "meta" && tag[1]) {
			const prop = tag[1].property || tag[1].name;
			if (
				(prop === "og:image" || prop === "twitter:image") &&
				typeof tag[1].content === "string"
			) {
				tag[1].content = resolveImageUrl(tag[1].content);
			}
		}
	}

	// Canonical tag
	resHead.push(["link", { rel: "canonical", href: canonicalUrl }]);

	// OpenGraph tags
	resHead.push(["meta", { property: "og:url", content: canonicalUrl }]);
	resHead.push(["meta", { property: "og:title", content: title }]);
	resHead.push(["meta", { property: "og:description", content: description }]);

	// Twitter Card tags
	resHead.push(["meta", { name: "twitter:title", content: title }]);
	resHead.push(["meta", { name: "twitter:description", content: description }]);

	// Schema.org JSON-LD Structured Data
	const jsonLd = getPageJsonLd(ctx, canonicalUrl);
	if (jsonLd.length > 0) {
		resHead.push([
			"script",
			{ type: "application/ld+json" },
			JSON.stringify(jsonLd.length === 1 ? jsonLd[0] : jsonLd),
		]);
	}

	return resHead;
}
