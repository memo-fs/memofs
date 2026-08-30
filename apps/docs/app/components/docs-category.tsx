import { Card, Cards } from "fumadocs-ui/components/card";
import { useLocation } from "react-router";
import { source } from "~/lib/source";

export function DocsCategory({ url }: { url?: string }) {
	const location = useLocation();
	const currentUrl = url ?? location.pathname;

	// Find the current page or category in source
	const page = source.getPageByHref(currentUrl);
	const targetSlugs =
		page?.page?.slugs ??
		currentUrl
			.replace(/^\/docs\/?/, "")
			.split("/")
			.filter(Boolean);

	// Get child pages in this directory
	const children = source.getPages().filter((p) => {
		if (p.slugs.length !== targetSlugs.length + 1) return false;
		return targetSlugs.every((slug: string, i: number) => p.slugs[i] === slug);
	});

	if (children.length === 0) {
		return null;
	}

	return (
		<Cards className="my-6">
			{children.map((child) => (
				<Card
					key={child.url}
					href={child.url}
					title={child.data.title}
					description={child.data.description}
				/>
			))}
		</Cards>
	);
}
