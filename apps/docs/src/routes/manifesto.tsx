import { DocsBody } from "fumadocs-ui/layouts/docs/page";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Footer } from "../components/footer";
import { useMDXComponents } from "../components/mdx";
import { baseOptions } from "../lib/layout.shared";
import { createPageMeta } from "../lib/meta";
import { createRelativeLink } from "../lib/relative-link";
import { ROUTES } from "../lib/site";
import { manifestoDocs } from "../lib/source";
import type { Route } from "./+types/manifesto";

export const meta: Route.MetaFunction = () =>
	createPageMeta({
		title: "Manifesto — MemoFS",
		description:
			"The MemoFS Manifesto: machine-native, file-first memory infrastructure for autonomous AI agents.",
		path: ROUTES.manifesto,
	});

export async function loader() {
	const entry = manifestoDocs.getPage("index.md");
	if (!entry) {
		throw new Response("Manifesto document not found", { status: 404 });
	}

	return {
		docPath: "index.md",
	};
}

export default function ManifestoPage({
	loaderData: _loaderData,
}: Route.ComponentProps) {
	const entry = manifestoDocs.getPage("index.md");
	if (!entry) {
		throw new Response("Manifesto document not found", { status: 404 });
	}
	const Mdx = entry.body;

	return (
		<HomeLayout {...baseOptions()}>
			<div className="relative w-full bg-background text-foreground">
				<main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 sm:py-12 lg:px-8">
					<DocsBody className="max-w-none prose article-prose dark:prose-invert">
						<Mdx
							components={useMDXComponents({
								a: createRelativeLink({ url: ROUTES.manifesto }),
							})}
						/>
					</DocsBody>
				</main>

				<Footer />
			</div>
		</HomeLayout>
	);
}
