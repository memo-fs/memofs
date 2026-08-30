import defaultMdxComponents from "fumadocs-ui/mdx";
import type { ComponentProps } from "react";

export function createRelativeLink(page: { url: string; slugs?: string[] }) {
	const DefaultLink = defaultMdxComponents.a;

	return function RelativeLink(props: ComponentProps<typeof DefaultLink>) {
		let href = props.href;

		if (href) {
			if (
				href.startsWith("http://") ||
				href.startsWith("https://") ||
				href.startsWith("//") ||
				href.startsWith("#") ||
				href.startsWith("mailto:")
			) {
				return <DefaultLink {...props} href={href} />;
			}

			if (href.startsWith("./") || href.startsWith("../")) {
				// Strip .mdx / .md extensions and anchors
				const match = href.match(/^([^#?]*)(.*)$/);
				const pathPart = (match?.[1] ?? "").replace(/\.mdx?$/, "");
				const suffix = match?.[2] ?? "";

				try {
					const base = page.url.endsWith("/") ? page.url : `${page.url}/`;
					const resolved = new URL(pathPart, `https://memofs.local${base}`);
					href = resolved.pathname.replace(/\/$/, "") + suffix;
				} catch {
					href = pathPart + suffix;
				}
			} else if (
				href.startsWith("/") &&
				href !== "/" &&
				!href.startsWith("/docs") &&
				!href.startsWith("/og") &&
				!href.startsWith("/favicon") &&
				!href.startsWith("/logo") &&
				!href.startsWith("/assets")
			) {
				const match = href.match(/^([^#?]*)(.*)$/);
				const pathPart = (match?.[1] ?? "").replace(/\.mdx?$/, "");
				const suffix = match?.[2] ?? "";
				href = `/docs${pathPart.startsWith("/") ? "" : "/"}${pathPart}${suffix}`;
			} else if (href.endsWith(".mdx") || href.endsWith(".md")) {
				href = href.replace(/\.mdx?(#.*)?$/, "$1");
			}
		}

		return <DefaultLink {...props} href={href} />;
	};
}
