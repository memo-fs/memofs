import { HomeLayout } from "fumadocs-ui/layouts/home";
import { BookOpen, Newspaper, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
	ArticleCard,
	type ArticleCardData,
} from "../../components/articles/article-card";
import { Crosshair } from "../../components/crosshair";
import { Footer } from "../../components/footer";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
	normalizeCat,
	sortArticlesNewestFirst,
	toArticleCard,
} from "../../lib/articles";
import { baseOptions } from "../../lib/layout.shared";
import { createPageMeta } from "../../lib/meta";
import { ROUTES } from "../../lib/site";
import { articles } from "../../lib/source";
import { cn } from "../../lib/utils";
import type { Route } from "./+types/index";

export const meta: Route.MetaFunction = () =>
	createPageMeta({
		title: "Articles & Engineering Deep Dives",
		description:
			"Technical deep dives on distributed memory planes, monotonic sync protocols, AI agent state, and edge runtime systems.",
		path: ROUTES.articles,
	});

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const activeCategory = url.searchParams.get("category") || "all";
	const currentQuery = url.searchParams.get("q") || "";

	const pages = articles.getPages();

	const allArticles: ArticleCardData[] = await Promise.all(
		pages.map((p) => toArticleCard(p)),
	);

	// Sort newest first
	sortArticlesNewestFirst(allArticles);

	const CATEGORY_TABS = [
		{ id: "all", label: "All Articles" },
		{ id: "Architecture", label: "Architecture" },
		{ id: "Engineering", label: "Engineering" },
		{ id: "Guide", label: "Guides" },
		{ id: "Announcement", label: "Announcements" },
	];

	const categoriesWithCounts = CATEGORY_TABS.map((tab) => {
		if (tab.id === "all") {
			return { ...tab, count: allArticles.length };
		}
		const count = allArticles.filter(
			(a) => normalizeCat(a.category) === normalizeCat(tab.id),
		).length;
		return { ...tab, count };
	});

	return {
		allArticles,
		categoriesWithCounts,
		activeCategory,
		currentQuery,
	};
}

export default function ArticlesIndexPage({
	loaderData,
}: Route.ComponentProps) {
	const { allArticles, categoriesWithCounts } = loaderData;
	const [searchParams, setSearchParams] = useSearchParams();
	const searchInputRef = useRef<HTMLInputElement>(null);

	const activeCategory = searchParams.get("category") || "all";
	const currentQuery = searchParams.get("q") || "";
	const [searchValue, setSearchValue] = useState(currentQuery);

	const filteredArticles = useMemo(() => {
		let list = allArticles;

		if (activeCategory && activeCategory !== "all") {
			const target = normalizeCat(activeCategory);
			list = list.filter((a) => normalizeCat(a.category) === target);
		}

		if (currentQuery.trim()) {
			const q = currentQuery.toLowerCase().trim();
			list = list.filter(
				(a) =>
					a.title.toLowerCase().includes(q) ||
					a.description?.toLowerCase().includes(q) ||
					a.tags?.some((t) => t.toLowerCase().includes(q)),
			);
		}

		return list;
	}, [allArticles, activeCategory, currentQuery]);

	const isDefaultView =
		(activeCategory === "all" || !activeCategory) && !currentQuery.trim();

	let featuredArticles: ArticleCardData[] = [];
	let gridPool: ArticleCardData[] = filteredArticles;

	if (isDefaultView) {
		// Only select articles that explicitly have featured: true (up to 2 hero slots)
		featuredArticles = filteredArticles
			.filter((a) => Boolean(a.featured))
			.slice(0, 2);
		const featuredSlugs = new Set(featuredArticles.map((a) => a.slug));
		gridPool = filteredArticles.filter((a) => !featuredSlugs.has(a.slug));
	}

	// Keyboard shortcut: Press "/" to focus search
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.key === "/" &&
				document.activeElement?.tagName !== "INPUT" &&
				document.activeElement?.tagName !== "TEXTAREA"
			) {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const handleCategorySelect = (categoryId: string) => {
		setSearchParams(
			(params) => {
				if (categoryId === "all") {
					params.delete("category");
				} else {
					params.set("category", categoryId);
				}
				return params;
			},
			{ replace: true, preventScrollReset: true },
		);
	};

	const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSearchParams(
			(params) => {
				if (searchValue.trim()) {
					params.set("q", searchValue.trim());
				} else {
					params.delete("q");
				}
				return params;
			},
			{ replace: true, preventScrollReset: true },
		);
	};

	const handleClearSearch = () => {
		setSearchValue("");
		setSearchParams(
			(params) => {
				params.delete("q");
				return params;
			},
			{ replace: true, preventScrollReset: true },
		);
	};

	const handleResetAllFilters = () => {
		setSearchValue("");
		setSearchParams({}, { replace: true, preventScrollReset: true });
	};

	return (
		<HomeLayout {...baseOptions()}>
			<div className="relative w-full bg-background text-foreground">
				<section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
					{/* Articles Hero — minimal landing hero */}
					<div className="relative mx-auto w-full max-w-5xl">
						{/* Outer drafting guidelines */}
						<div className="pointer-events-none absolute -left-6 -right-6 top-0 origin-center animate-line-x border-t border-dashed border-border/70 sm:-left-10 sm:-right-10" />
						<div className="pointer-events-none absolute -left-6 -right-6 bottom-0 origin-center animate-line-x border-b border-dashed border-border/70 sm:-left-10 sm:-right-10" />
						<div className="pointer-events-none absolute -top-6 -bottom-6 left-0 origin-top animate-line-y border-l border-dashed border-border/70 sm:-top-8 sm:-bottom-8" />
						<div className="pointer-events-none absolute -top-6 -bottom-6 right-0 origin-top animate-line-y border-r border-dashed border-border/70 sm:-top-8 sm:-bottom-8" />

						<Crosshair className="-top-1.75 -left-1.75" />
						<Crosshair className="-top-1.75 -right-1.75" />
						<Crosshair className="-bottom-1.75 -left-1.75" />
						<Crosshair className="-bottom-1.75 -right-1.75" />

						{/* Top bar */}
						<div className="relative flex items-center justify-between border-x border-t border-dashed border-border px-4 py-2 font-mono text-xs text-muted-foreground backdrop-blur-xs sm:px-6">
							<span className="font-semibold text-foreground">
								~ <code>ls .memofs/articles/</code>
							</span>
							<span className="hidden text-[10px] tracking-widest uppercase sm:inline">
								journal / index
							</span>
						</div>

						{/* Main box */}
						<div className="relative border border-dashed border-border">
							{/* Headline */}
							<div className="relative px-4 py-8 text-center sm:px-8 sm:py-10">
								<div className="flex items-center justify-center gap-2">
									<span aria-hidden className="size-1.5 bg-accent-gold" />
									<span className="font-heading font-semibold text-[0.7rem] text-accent-gold uppercase tracking-[0.2em]">
										MemoFS Engineering Journal
									</span>
								</div>
								<h1 className="mx-auto mt-3 max-w-3xl text-balance font-bold font-heading text-4xl text-foreground leading-[1.04] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
									Articles
								</h1>
							</div>

							{/* Mid divider with crosshairs */}
							<div className="relative border-t border-dashed border-border">
								<div className="pointer-events-none absolute inset-x-0 top-0 origin-left animate-line-x border-t border-dashed border-border" />
								<Crosshair className="-top-1.75 -left-1.75" />
								<Crosshair className="-top-1.75 -right-1.75" />
							</div>

							{/* Subtitle */}
							<div className="px-4 py-5 text-center sm:px-8 sm:py-6">
								<p className="mx-auto max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
									Engineering deep dives, architecture specifications, and
									memory runtime notes.
								</p>
							</div>
						</div>

						{/* Bottom bar */}
						<div className="relative flex items-center justify-between border-x border-b border-dashed border-border px-4 py-2 font-mono text-[10px] text-muted-foreground/70 backdrop-blur-xs sm:px-6">
							<span>[catalog: articles]</span>
							<span>[entries: {allArticles.length}]</span>
						</div>
					</div>

					{/* Category Filter Row & Search Bar */}
					<div className="mx-auto mt-10 flex max-w-5xl flex-col items-center justify-between gap-4 border-border/60 border-b pb-6 sm:flex-row">
						{/* Dot-separated category links */}
						<nav
							aria-label="Article categories"
							className="flex flex-wrap items-center justify-center gap-1.5 font-mono text-xs sm:gap-2"
						>
							{categoriesWithCounts.map((cat, index) => {
								const isActive =
									(cat.id === "all" && activeCategory === "all") ||
									normalizeCat(activeCategory) === normalizeCat(cat.id);

								return (
									<div key={cat.id} className="flex items-center">
										{index > 0 && (
											<span
												aria-hidden
												className="mr-1.5 text-muted-foreground/40 sm:mr-2"
											>
												·
											</span>
										)}
										<button
											type="button"
											onClick={() => handleCategorySelect(cat.id)}
											className={cn(
												"cursor-pointer transition-colors duration-150",
												isActive
													? "font-semibold text-accent-gold"
													: "text-muted-foreground hover:text-foreground",
											)}
										>
											{cat.label}
										</button>
									</div>
								);
							})}
						</nav>

						{/* Quick Search */}
						<form
							onSubmit={handleSearchSubmit}
							className="relative flex w-full items-center sm:w-60"
						>
							<Search className="absolute left-3 size-3.5 text-muted-foreground" />
							<Input
								ref={searchInputRef}
								type="text"
								placeholder="Search... (/)"
								value={searchValue}
								onChange={(e) => setSearchValue(e.target.value)}
								className="h-8 border-border/60 bg-muted/30 pr-7 pl-8 font-mono text-xs focus-visible:border-primary/50"
							/>
							{searchValue && (
								<button
									type="button"
									onClick={handleClearSearch}
									className="absolute right-2 text-muted-foreground hover:text-foreground"
									aria-label="Clear search"
								>
									<X className="size-3.5" />
								</button>
							)}
						</form>
					</div>

					{/* Search state summary indicator */}
					{currentQuery && (
						<div className="mx-auto mt-4 flex max-w-5xl items-center justify-between border-border/40 border-b pb-3 font-mono text-muted-foreground text-xs">
							<span>
								Showing {filteredArticles.length}{" "}
								{filteredArticles.length === 1 ? "result" : "results"} for "
								<span className="text-foreground">{currentQuery}</span>"
							</span>
							<button
								type="button"
								onClick={handleClearSearch}
								className="text-accent-gold underline hover:opacity-80"
							>
								Clear search
							</button>
						</div>
					)}

					{/* Main Articles Area */}
					<div className="mx-auto mt-8 max-w-5xl space-y-8">
						{/* Top 2-Column Featured Hero Cards */}
						{featuredArticles.length > 0 && (
							<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
								{featuredArticles.map((article) => (
									<ArticleCard
										key={article.slug}
										article={article}
										featured={true}
									/>
								))}
							</div>
						)}

						{/* 3-Column Standard Articles Grid */}
						{gridPool.length > 0 ? (
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
								{gridPool.map((article) => (
									<ArticleCard key={article.slug} article={article} />
								))}
							</div>
						) : (
							/* Empty State */
							!featuredArticles.length && (
								<div className="border border-border/70 border-dashed bg-card/20 p-12 text-center">
									<BookOpen className="mx-auto size-8 text-muted-foreground/60" />
									<h3 className="mt-3 font-bold font-heading text-foreground text-lg">
										No articles found
									</h3>
									<p className="mt-1 font-mono text-muted-foreground text-xs">
										No publications matched your search query or category
										filter.
									</p>
									<Button
										variant="outline"
										size="sm"
										onClick={handleResetAllFilters}
										className="mt-5 font-mono text-xs"
									>
										Reset search filters
									</Button>
								</div>
							)
						)}
					</div>

					{/* Bottom CTA Banner */}
					<div className="relative mx-auto mt-20 max-w-5xl overflow-hidden border border-border bg-card/40 p-8 text-center sm:p-12">
						<div className="mx-auto max-w-2xl space-y-4">
							<div className="inline-flex items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-1 font-mono text-[11px] text-primary uppercase tracking-widest">
								<Newspaper className="size-3.5" />
								<span>Stay Synchronized</span>
							</div>

							<h2 className="text-balance font-bold font-heading text-2xl text-foreground sm:text-4xl">
								Persistent memory for your AI agents.
							</h2>

							<p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
								Connect your AI agents and team workspaces to a unified,
								verifiable memory plane in less than 3 minutes.
							</p>

							<div className="pt-3">
								<Link
									to="/docs"
									className="inline-flex items-center justify-center rounded-none bg-primary px-5 py-2.5 font-mono font-medium text-primary-foreground text-xs hover:bg-primary/90 transition-colors"
								>
									Read Documentation
								</Link>
							</div>
						</div>
					</div>
				</section>

				<Footer />
			</div>
		</HomeLayout>
	);
}
