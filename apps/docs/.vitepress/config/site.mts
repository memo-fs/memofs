export const site = {
	title: "MemoFS",
	url: "https://docs.memofs.dev",
	description:
		"File-first memory layer for AI agents. Store decisions as markdown in your repo. Local by default, cloud-ready. MIT licensed.",
	repo: "https://github.com/memo-fs/memofs",
	npm: "https://www.npmjs.com/package/@memofs/core",
	cloud: "https://memofs.dev",
	x: "https://x.com/memofsdev",
	bluesky: "https://bsky.app/profile/memofs.dev",
	youtube: "https://www.youtube.com/@memofsdev",
	license: "MIT",
} as const;

/**
 * Resolves an image path to a fully-qualified absolute URL required by social crawlers (X, Open Graph).
 */
export function resolveImageUrl(image: string): string {
	if (image.startsWith("https://")) {
		return image;
	}
	const cleanPath = image.startsWith("/") ? image : `/${image}`;
	return `${site.url}${cleanPath}`;
}
