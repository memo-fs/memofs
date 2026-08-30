import * as fs from "node:fs";
import * as pathModule from "node:path";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
	EditOnGitHub,
	PageLastUpdate,
} from "fumadocs-ui/layouts/docs/page";
import { LLMCopyButton, ViewOptions } from "~/components/ai/page-actions";
import { useMDXComponents } from "~/components/mdx";
import { getLLMText } from "~/lib/get-llm-text";
import { baseOptions } from "~/lib/layout.shared";
import { createRelativeLink } from "~/lib/relative-link";
import { getPageImagePath } from "~/lib/shared";
import { docs, resolveDocPage, source } from "~/lib/source";
import type { Route } from "./+types/$";

export async function loader({ params, request }: Route.LoaderArgs) {
	const rawSlug = (params as Record<string, string | undefined>)["*"] ?? "";
	const isMarkdownRequested =
		rawSlug.endsWith(".md") ||
		rawSlug.endsWith(".mdx") ||
		request.headers.get("Accept")?.includes("text/markdown");

	const { page } = resolveDocPage(rawSlug);

	if (isMarkdownRequested) {
		const markdown = await getLLMText(page);
		return new Response(markdown, {
			headers: {
				"Content-Type": "text/markdown; charset=utf-8",
				Vary: "Accept",
				"Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
			},
		});
	}

	let lastModified: number | undefined;
	const cleanPath = page.path.replace(/\.mdx?$/, "");
	try {
		const mdxPath = pathModule.join(
			process.cwd(),
			"apps/docs/content/docs",
			`${cleanPath}.mdx`,
		);
		const stat = fs.statSync(mdxPath);
		lastModified = stat.mtimeMs;
	} catch {
		try {
			const mdPath = pathModule.join(
				process.cwd(),
				"apps/docs/content/docs",
				`${cleanPath}.md`,
			);
			const stat = fs.statSync(mdPath);
			lastModified = stat.mtimeMs;
		} catch {
			// ignore
		}
	}

	return {
		path: page.path,
		url: page.url,
		title: page.data.title,
		description: page.data.description,
		imagePath: getPageImagePath(page.slugs),
		lastModified,
		pageTree: await source.serializePageTree(source.getPageTree()),
	};
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const rawSlug = (params as Record<string, string | undefined>)["*"] ?? "";
	const { page } = resolveDocPage(rawSlug);

	return {
		path: page.path,
		url: page.url,
		title: page.data.title,
		description: page.data.description,
		imagePath: getPageImagePath(page.slugs),
		pageTree: await source.serializePageTree(source.getPageTree()),
	};
}

export const meta: Route.MetaFunction = ({ matches }) => {
	const docMatch = matches.find((m) => m?.id === "routes/docs/$");
	const data = docMatch?.loaderData as
		| { title?: string; description?: string; url?: string; imagePath?: string }
		| undefined;

	const pageTitle = data?.title
		? `${data.title} | MemoFS`
		: "MemoFS Documentation";
	const description =
		data?.description ||
		"File-first memory runtime for AI agents. Store decisions as markdown in your repo. Local by default, cloud-ready.";
	const canonicalUrl = `https://docs.memofs.dev${data?.url ?? "/docs"}`;
	const ogImageUrl = data?.imagePath
		? `https://docs.memofs.dev${data.imagePath}`
		: "https://docs.memofs.dev/og-default.png";

	return [
		{ title: pageTitle },
		{ name: "description", content: description },
		{ property: "og:title", content: pageTitle },
		{ property: "og:description", content: description },
		{ property: "og:url", content: canonicalUrl },
		{ property: "og:image", content: ogImageUrl },
		{ property: "og:site_name", content: "MemoFS" },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:site", content: "@memofsdev" },
		{ name: "twitter:title", content: pageTitle },
		{ name: "twitter:description", content: description },
		{ name: "twitter:image", content: ogImageUrl },
		{ tagName: "link", rel: "canonical", href: canonicalUrl },
	];
};

function Content({
	path,
	url,
	lastModified,
}: {
	path: string;
	url: string;
	lastModified?: number;
}) {
	const page = docs.getPage(path);
	if (!page) throw new Error(`unknown page: ${path}`);

	const Mdx = page.body;
	const cleanDocPath =
		path.endsWith(".mdx") || path.endsWith(".md") ? path : `${path}.mdx`;
	const markdownUrl = `${url}.md`;
	const githubUrl = `https://github.com/memo-fs/memofs/blob/main/apps/docs/content/docs/${cleanDocPath}`;

	return (
		<DocsPage
			toc={page.toc}
			tableOfContent={{ style: "clerk" }}
			className="max-w-3xl px-4 sm:px-6"
		>
			<DocsTitle>{page.title}</DocsTitle>
			<DocsDescription>{page.description}</DocsDescription>
			<div className="not-prose my-4 flex flex-row items-center gap-2 border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-4">
				<LLMCopyButton markdownUrl={markdownUrl} />
				<ViewOptions markdownUrl={markdownUrl} githubUrl={githubUrl} />
			</div>
			<DocsBody className="max-w-3xl">
				<Mdx
					components={useMDXComponents({
						a: createRelativeLink(source, { url }),
					})}
				/>
			</DocsBody>
			<div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
				<EditOnGitHub href={githubUrl} />
				{lastModified ? <PageLastUpdate date={new Date(lastModified)} /> : null}
			</div>
		</DocsPage>
	);
}

export default function Page({ loaderData }: Route.ComponentProps) {
	const { path, pageTree } = useFumadocsLoader(loaderData);

	return (
		<DocsLayout {...baseOptions()} tree={pageTree}>
			<Content
				path={path}
				url={loaderData.url}
				lastModified={loaderData.lastModified}
			/>
		</DocsLayout>
	);
}
