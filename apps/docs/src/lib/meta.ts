/** Shared Open Graph, Twitter, and canonical metadata construction for pages. */

import type { MetaDescriptor } from "react-router";
import { SITE, toSiteUrl } from "./site";

/** Input used to create consistent metadata for a public page. */
interface PageMetaInput {
	title: string;
	description: string;
	path: string;
	imagePath?: string;
}

/** Creates the standard metadata shared by all public pages. */
export function createPageMeta({
	title,
	description,
	path,
	imagePath = SITE.defaultImagePath,
}: PageMetaInput): MetaDescriptor[] {
	const canonicalUrl = toSiteUrl(path);
	const imageUrl = toSiteUrl(imagePath);

	return [
		{ title },
		{ name: "description", content: description },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:url", content: canonicalUrl },
		{ property: "og:image", content: imageUrl },
		{ property: "og:site_name", content: SITE.name },
		{ property: "og:type", content: "website" },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:site", content: SITE.xHandle },
		{ name: "twitter:creator", content: SITE.xHandle },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
		{ name: "twitter:image", content: imageUrl },
		{ tagName: "link", rel: "canonical", href: canonicalUrl },
	];
}
