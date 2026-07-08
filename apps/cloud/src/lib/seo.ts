/**
 * Single source of truth for SEO + social-share metadata.
 *
 * Mirrors the {@link ./entitlements} + {@link ./site} SSOT pattern: every
 * Open Graph / Twitter / canonical value derives from `SITE_META` so a rebrand,
 * domain change, or default-image swap is a one-line edit here — never a
 * grep-and-replace across route modules. The `buildMeta()` helper returns the
 * full `meta()` array shape React Router renders via `<Meta />`, so each public
 * route imports it once instead of hand-repeating OG/Twitter/canonical fields.
 *
 * @see {@link https://reactrouter.com/explanation/meta#meta | React Router `meta`}
 */
import type { Route } from "~/+types/root";

/**
 * Site-wide metadata constants.
 *
 * `origin` is the production canonical base (matches `BETTER_AUTH_URL` in
 * `wrangler.toml` `[env.production.vars]` + `package.json` `homepage`). OG image
 * is served from `public/` via the `[assets]` binding.
 */
export const SITE_META = {
	/** Canonical production origin (no trailing slash). */
	origin: "https://memofs.dev",
	/** Product name, used in title suffixes + OG tags. */
	name: "Memo FS Cloud",
	/** Default social share image (1200×630, served from `public/`). */
	defaultImage: "/og-default.png",
	/** `@handle` for Twitter card attribution (without the leading `@`). */
	twitterHandle: "memofsdev",
	/** Default description used when a route omits one. */
	defaultDescription:
		"Local-first memory for AI apps. Memo FS Cloud mirrors your .memofs/ files across devices and hosts a secure serverless query runtime for fast remote semantic recall.",
} as const;

/**
 * Options for {@link buildMeta}.
 *
 * Every field is optional except `title` + `description`; OG/Twitter/canonical
 * default from {@link SITE_META}.
 */
export interface BuildMetaOptions {
	/** Page title (rendered verbatim — do NOT include the site name suffix). */
	title: string;
	/** Meta description (≤160 chars for the SERP snippet). */
	description: string;
	/**
	 * Canonical path on the production origin (e.g. `/pricing`). When set, emits
	 * `og:url` + `canonical`. Omit for routes whose canonical is the page itself.
	 */
	path?: string;
	/**
	 * Social share image (absolute path or full URL). Defaults to
	 * {@link SITE_META.defaultImage}.
	 */
	image?: string;
	/**
	 * When `true`, emits `robots: noindex, nofollow` so auth-gated / duplicate /
	 * thin routes stay out of the index. Dashboard, OAuth callback, and the team
	 * accept flow set this.
	 */
	noindex?: boolean;
}

/**
 * Resolves an image path to an absolute URL (OG/Twitter require absolute URLs).
 *
 * @param image - either an absolute path (`/og-default.png`) or a full URL.
 * @returns an absolute URL rooted at {@link SITE_META.origin}.
 */
function resolveImageUrl(image: string): string {
	if (image.startsWith("http")) return image;
	return `${SITE_META.origin}${image}`;
}

/**
 * Builds the full `meta()` array for a public route.
 *
 * Returns title + description + Open Graph + Twitter card + canonical (when
 * `path` is set). Pass the return value straight out of a route's `meta()`
 * export — `<Meta />` renders every entry. For noindex routes, call with
 * `noindex: true` to suppress indexing rather than constructing a partial set.
 *
 * @example
 * export function meta(_: Route.MetaArgs) {
 *   return buildMeta({
 *     title: "Pricing",
 *     description: "...",
 *     path: "/pricing",
 *   });
 * }
 */
export function buildMeta(options: BuildMetaOptions): Route.MetaDescriptors {
	const {
		title,
		description,
		path,
		image = SITE_META.defaultImage,
		noindex,
	} = options;

	const imageUrl = resolveImageUrl(image);
	const url = path ? `${SITE_META.origin}${path}` : undefined;

	return [
		{ title },
		{ name: "description", content: description },
		// Open Graph (Facebook, LinkedIn, Slack, etc.)
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:type", content: "website" },
		{ property: "og:site_name", content: SITE_META.name },
		{ property: "og:image", content: imageUrl },
		...(url ? [{ property: "og:url", content: url }] : []),
		// Twitter / X
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
		{ name: "twitter:image", content: imageUrl },
		...(SITE_META.twitterHandle
			? [{ name: "twitter:site", content: `@${SITE_META.twitterHandle}` }]
			: []),
		// Indexing directive
		...(noindex
			? [{ name: "robots", content: "noindex, nofollow" }]
			: []),
	];
}

/**
 * The `noindex` variant for routes that should never be indexed (auth-gated
 * dashboard, OAuth callbacks, the token-bearing team-accept flow). Returns ONLY
 * a title + the robots directive — OG/Twitter are pointless on noindex pages
 * and would bloat the head for no benefit.
 */
export function buildNoindexMeta(title: string): Route.MetaDescriptors {
	return [
		{ title },
		{ name: "robots", content: "noindex, nofollow" },
	];
}
