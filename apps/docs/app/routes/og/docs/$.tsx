import { generate as DefaultImage } from "fumadocs-ui/og/takumi";
import { ImageResponse } from "takumi-js/response";
import { resolveDocPage } from "~/lib/source";
import type { Route } from "./+types/$";

export async function loader({ params }: Route.LoaderArgs) {
	const rawSlug = (params as Record<string, string | undefined>)["*"] || "";
	const { page } = resolveDocPage(rawSlug, { stripTrailingImage: true });

	return new ImageResponse(
		<DefaultImage
			title={page.data.title}
			description={page.data.description}
			site="MemoFS"
			primaryColor="#258acb"
			icon={
				<svg
					width="40"
					height="40"
					viewBox="0 0 24 24"
					fill="none"
					stroke="#258acb"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<title>MemoFS</title>
					<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
					<path d="m3.3 7 8.7 5 8.7-5" />
					<path d="M12 22V12" />
				</svg>
			}
		/>,
		{
			width: 1200,
			height: 630,
			format: "webp",
		},
	);
}
