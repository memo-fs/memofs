import { llms } from "fumadocs-core/source";
import { source } from "../lib/source";

export function loader() {
	return new Response(llms(source).index(), {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
		},
	});
}
