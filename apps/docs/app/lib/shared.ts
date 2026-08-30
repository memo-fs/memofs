export const docsImageRoute = "/og/docs";

export function getPageImagePath(slugs: string[], locale?: string) {
	return (
		"/" +
		[locale, ...docsImageRoute.split("/"), ...slugs, "image.webp"]
			.filter(Boolean)
			.join("/")
	);
}
