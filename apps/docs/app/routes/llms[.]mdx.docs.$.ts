import { getLLMText } from "~/lib/get-llm-text";
import { resolveDocPage } from "~/lib/source";
import type { Route } from "./+types/llms[.]mdx.docs.$";

export async function loader({ params }: Route.LoaderArgs) {
	const rawSlug = (params as Record<string, string | undefined>)["*"] ?? "";
	const { page } = resolveDocPage(rawSlug);

	const content = await getLLMText(page);

	return new Response(content, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
		},
	});
}
