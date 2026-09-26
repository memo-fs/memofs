import { DocsBody } from "fumadocs-ui/layouts/docs/page";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { ArrowLeft, ArrowRight, Tag } from "lucide-react";
import { Link } from "react-router";
import {
	ArticleCard,
	type ArticleCardData,
} from "../../components/articles/article-card";
import { ArticleHeader } from "../../components/articles/article-header";
import { ArticleShare } from "../../components/articles/article-share";
import { AuthorAvatar } from "../../components/articles/author-avatar";
import { Footer } from "../../components/footer";
import { getMDXComponents } from "../../components/mdx";
import { Badge } from "../../components/ui/badge";
import { sortArticlesNewestFirst, toArticleCard } from "../../lib/articles";
import { baseOptions } from "../../lib/layout.shared";
import { createPageMeta } from "../../lib/meta";
import { createRelativeLink } from "../../lib/relative-link";
import { ROUTES, SITE } from "../../lib/site";
import { articles, articlesDocs } from "../../lib/source";
import type { Route } from "./+types/$slug";

export const meta: Route.MetaFunction = ({ loaderData }) => {
	if (!loaderData?.article) {
		return createPageMeta({
			title: "Article Not Found",
			description: "The requested engineering article could not be found.",
			path: ROUTES.articles,
		});
	}

	const { article } = loaderData;
	return createPageMeta({
		title: article.title,
		description: article?.description ?? "",
		path: `${ROUTES.articles}/${article.slug}`,
	});
};

export async function loader({ params }: Route.LoaderArgs) {
	const rawSlug = (params as Record<string, string | undefined>).slug ?? "";
	const cleanSlug = rawSlug.replace(/\.mdx?$/, "");

	const page = articles.getPage([cleanSlug]);
	if (!page) {
		throw new Response("Article not found", { status: 404 });
	}

	const article: ArticleCardData = await toArticleCard(page, cleanSlug);

	// Determine next, prev, and related articles
	const allPages = articles.getPages();
	const allArticles: ArticleCardData[] = await Promise.all(
		allPages.map((p) => toArticleCard(p)),
	);

	sortArticlesNewestFirst(allArticles);

	const currentIndex = allArticles.findIndex((a) => a.slug === cleanSlug);
	const prevArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;
	const nextArticle =
		currentIndex >= 0 && currentIndex < allArticles.length - 1
			? allArticles[currentIndex + 1]
			: null;

	const relatedArticles = allArticles
		.filter((a) => a.slug !== cleanSlug && a.category === article.category)
		.slice(0, 2);

	const currentUrl = `${SITE.docsUrl}/articles/${cleanSlug}`;

	return {
		article,
		docPath: `${cleanSlug}.md`,
		prevArticle,
		nextArticle,
		relatedArticles,
		currentUrl,
	};
}

export default function ArticleDetailPage({
	loaderData,
}: Route.ComponentProps) {
	const {
		article,
		docPath,
		prevArticle,
		nextArticle,
		relatedArticles,
		currentUrl,
	} = loaderData;

	// Resolve the compiled MDX component
	const docEntry = articlesDocs.getPage(docPath);
	const Mdx =
		docEntry?.body ||
		(
			articles.getPage([article.slug])?.data as {
				body?: React.ComponentType<{ components: unknown }>;
			}
		)?.body;

	const mdxComponents = getMDXComponents({
		a: createRelativeLink({ url: `/articles/${article.slug}` }),
	});

	return (
		<HomeLayout {...baseOptions()}>
			<div className="relative w-full bg-background text-foreground">
				<section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
					{/* NPM-style Header with Wireframe Graphic */}
					<ArticleHeader
						title={article.title}
						category={article.category}
						publishedAt={article.publishedAt}
						readingTimeMinutes={article.readingTimeMinutes}
						backHref="/articles"
						backLabel="Back to Articles"
					/>

					{/* Centered Main Article Body */}
					<main className="mx-auto mt-10 max-w-3xl">
						{/* Author byline & Quick Share bar */}
						<div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-border/40 border-b pb-6">
							<div className="flex items-center gap-3">
								<AuthorAvatar
									name={article.authorName}
									avatarUrl={article.authorAvatarUrl}
									initials={article.authorInitials}
									className="size-9 border-border text-foreground text-xs"
								/>
								<div>
									<p className="font-mono font-semibold text-foreground text-xs">
										{article.authorName}
									</p>
									{article.authorRole && (
										<p className="font-mono text-[11px] text-muted-foreground">
											{article.authorRole}
										</p>
									)}
								</div>
							</div>
							<ArticleShare title={article.title} url={currentUrl} />
						</div>

						{/* MDX / Markdown Prose Content */}
						<DocsBody className="max-w-none prose article-prose dark:prose-invert">
							{Mdx ? <Mdx components={mdxComponents} /> : null}
						</DocsBody>

						{/* Tags Footer */}
						{article.tags && article.tags.length > 0 && (
							<div className="mt-12 flex flex-wrap items-center gap-2 border-border/40 border-t pt-6">
								<span className="mr-2 flex items-center gap-1.5 font-mono text-muted-foreground text-xs uppercase tracking-wider">
									<Tag className="size-3.5" />
									Topics:
								</span>
								{article.tags.map((tag) => (
									<Badge
										key={tag}
										variant="secondary"
										className="font-mono text-muted-foreground text-xs"
									>
										#{tag}
									</Badge>
								))}
							</div>
						)}

						{/* Bottom Share Bar */}
						<div className="mt-6 border-border/40 border-t pt-6">
							<ArticleShare title={article.title} url={currentUrl} />
						</div>

						{/* Next / Previous Article Navigation */}
						{(prevArticle || nextArticle) && (
							<div className="mt-12 grid grid-cols-1 gap-4 border-border/60 border-t pt-8 sm:grid-cols-2">
								{prevArticle ? (
									<Link
										to={`/articles/${prevArticle.slug}`}
										className="group flex flex-col justify-between border border-border/80 bg-card/40 p-5 transition-colors hover:border-primary/40 hover:bg-card/70"
									>
										<span className="flex items-center gap-1.5 font-mono text-muted-foreground text-xs uppercase tracking-wider">
											<ArrowLeft className="size-3 transition-transform group-hover:-translate-x-1" />
											Previous Article
										</span>
										<h4 className="mt-2 font-semibold text-foreground text-sm leading-snug group-hover:text-primary">
											{prevArticle.title}
										</h4>
									</Link>
								) : (
									<div className="hidden sm:block" />
								)}

								{nextArticle && (
									<Link
										to={`/articles/${nextArticle.slug}`}
										className="group flex flex-col justify-between border border-border/80 bg-card/40 p-5 text-right transition-colors hover:border-primary/40 hover:bg-card/70"
									>
										<span className="flex items-center justify-end gap-1.5 font-mono text-muted-foreground text-xs uppercase tracking-wider">
											Next Article
											<ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
										</span>
										<h4 className="mt-2 font-semibold text-foreground text-sm leading-snug group-hover:text-primary">
											{nextArticle.title}
										</h4>
									</Link>
								)}
							</div>
						)}
					</main>

					{/* Related Articles Section */}
					{relatedArticles.length > 0 && (
						<div className="mx-auto mt-20 max-w-4xl border-border/60 border-t pt-12">
							<div className="mb-6 flex items-center justify-between">
								<h3 className="font-bold text-foreground text-xl">
									Related Deep Dives
								</h3>
								<Link
									to="/articles"
									className="font-mono text-primary text-xs underline underline-offset-4 hover:opacity-80"
								>
									View all articles ➔
								</Link>
							</div>

							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								{relatedArticles.map((rel) => (
									<ArticleCard key={rel.slug} article={rel} />
								))}
							</div>
						</div>
					)}

					{/* Bottom CTA */}
					<div className="relative mx-auto mt-20 max-w-4xl overflow-hidden border border-border bg-card/40 p-8 text-center sm:p-12">
						<h3 className="text-balance font-bold text-2xl text-foreground sm:text-3xl">
							Synchronize your agent memory plane today.
						</h3>
						<p className="mx-auto mt-3 max-w-xl text-muted-foreground text-sm leading-relaxed">
							Zero configuration file syncing for AI agents and team workspaces.
						</p>
						<div className="mt-6 flex justify-center">
							<Link
								to="/docs"
								className="inline-flex items-center justify-center rounded-none bg-primary px-5 py-2.5 font-mono font-medium text-primary-foreground text-xs hover:bg-primary/90 transition-colors"
							>
								Get Started with MemoFS
							</Link>
						</div>
					</div>
				</section>

				<Footer />
			</div>
		</HomeLayout>
	);
}
