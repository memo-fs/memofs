import { describe, expect, it } from "vitest";

import { buildMeta, buildNoindexMeta, SITE_META } from "../seo";

/**
 * Unit tests for the SEO metadata SSOT (`src/lib/seo.ts`).
 *
 * Covers the shapes React Router's `<Meta />` consumes: `buildMeta` must emit
 * title + description + OG + Twitter + (optional) canonical; `buildNoindexMeta`
 * emits title + the robots directive only. The OG/Twitter image and canonical
 * URL must be absolute (OG scrapers reject relative paths), and the noindex
 * path must never emit OG/Twitter tags (wasteful on non-indexed pages).
 */
describe("SITE_META", () => {
	it("exposes an absolute production origin with no trailing slash", () => {
		expect(SITE_META.origin).toMatch(/^https:\/\/[^/]+$/);
	});

	it("exposes a default image path rooted at the origin when resolved", () => {
		expect(SITE_META.defaultImage.startsWith("/")).toBe(true);
	});
});

describe("buildMeta", () => {
	it("emits title + description + OG + Twitter for a public route", () => {
		const meta = buildMeta({
			title: "Pricing",
			description: "Plans and pricing.",
			path: "/pricing",
		});

		const names = meta.map((m) => ("name" in m ? m.name : null));
		const props = meta.map((m) => ("property" in m ? m.property : null));

		expect(meta).toContainEqual({ title: "Pricing" });
		expect(names).toContain("description");
		// Open Graph
		expect(props).toContain("og:title");
		expect(props).toContain("og:description");
		expect(props).toContain("og:type");
		expect(props).toContain("og:site_name");
		expect(props).toContain("og:image");
		expect(props).toContain("og:url");
		// Twitter
		expect(names).toContain("twitter:card");
		expect(names).toContain("twitter:title");
		expect(names).toContain("twitter:description");
		expect(names).toContain("twitter:image");
		expect(names).toContain("twitter:site");
	});

	it("resolves the OG image to an absolute URL rooted at SITE_META.origin", () => {
		const meta = buildMeta({
			title: "Home",
			description: "desc",
			path: "/",
		});
		const ogImage = meta.find(
			(m): m is { property: string; content: string } =>
				"property" in m && m.property === "og:image",
		);
		expect(ogImage?.content).toBe(`${SITE_META.origin}${SITE_META.defaultImage}`);
	});

	it("accepts a custom image override (absolute path → absolute URL)", () => {
		const meta = buildMeta({
			title: "x",
			description: "y",
			path: "/p",
			image: "/og-custom.png",
		});
		const ogImage = meta.find(
			(m): m is { property: string; content: string } =>
				"property" in m && m.property === "og:image",
		);
		expect(ogImage?.content).toBe(`${SITE_META.origin}/og-custom.png`);
	});

	it("leaves a full-URL image untouched", () => {
		const full = "https://cdn.example.com/img.png";
		const meta = buildMeta({
			title: "x",
			description: "y",
			image: full,
		});
		const ogImage = meta.find(
			(m): m is { property: string; content: string } =>
				"property" in m && m.property === "og:image",
		);
		expect(ogImage?.content).toBe(full);
	});

	it("emits og:url + canonical only when path is provided", () => {
		const withPath = buildMeta({ title: "t", description: "d", path: "/x" });
		const withoutPath = buildMeta({ title: "t", description: "d" });

		const hasOgUrl = (m: ReturnType<typeof buildMeta>) =>
			m.some(
				(e): e is { property: string; content: string } =>
					"property" in e && e.property === "og:url",
			);

		expect(hasOgUrl(withPath)).toBe(true);
		expect(
			(withPath.find(
				(e): e is { property: string; content: string } =>
					"property" in e && e.property === "og:url",
			)?.content),
		).toBe(`${SITE_META.origin}/x`);
		expect(hasOgUrl(withoutPath)).toBe(false);
	});

	it("does not emit a robots directive for an indexable route", () => {
		const meta = buildMeta({ title: "t", description: "d" });
		expect(
			meta.some(
				(m) => "name" in m && m.name === "robots",
			),
		).toBe(false);
	});
});

describe("buildNoindexMeta", () => {
	it("emits title + robots noindex,nofollow only", () => {
		const meta = buildNoindexMeta("Dashboard");

		expect(meta).toHaveLength(2);
		expect(meta).toContainEqual({ title: "Dashboard" });
		expect(meta).toContainEqual({
			name: "robots",
			content: "noindex, nofollow",
		});
	});

	it("never emits OG/Twitter tags (wasteful on noindex pages)", () => {
		const meta = buildNoindexMeta("Settings");
		const keys = meta.flatMap((m) =>
			"property" in m
				? [m.property]
				: "name" in m && m.name.startsWith("twitter")
					? [m.name]
					: [],
		);
		expect(keys).toEqual([]);
	});
});
