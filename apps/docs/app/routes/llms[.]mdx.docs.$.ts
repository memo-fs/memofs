import { getLLMText } from "~/lib/get-llm-text";
import { source } from "~/lib/source";
import type { Route } from "./+types/llms[.]mdx.docs.$";

export async function loader({ params }: Route.LoaderArgs) {
	const rawSlug = (params as Record<string, string | undefined>)["*"] ?? "";
	const cleanSlug = rawSlug.replace(/\.mdx?$/, "");
	const slugs = cleanSlug.split("/").filter((v) => v.length > 0);
	const page = source.getPage(slugs);

	if (!page) {
		return new Response("Not found", { status: 404 });
	}

	const content = await getLLMText(page);

	return new Response(content, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
		},
	});
}
