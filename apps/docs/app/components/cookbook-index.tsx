import { useMemo, useState } from "react";
import { Link } from "react-router";
import { source } from "~/lib/source";

interface Category {
	id: string;
	name: string;
}

const CATEGORIES: Category[] = [
	{ id: "all", name: "All Recipes" },
	{ id: "agents", name: "Coding Agents & IDEs" },
	{ id: "connectors", name: "Connectors" },
	{ id: "frameworks", name: "Frameworks & MCP" },
];

function getRecipeCategory(url: string, title: string): string {
	const u = url.toLowerCase();
	const t = title.toLowerCase();

	if (
		u.includes("connector") ||
		t.includes("connector") ||
		u.includes("github") ||
		u.includes("linear") ||
		u.includes("notion")
	) {
		return "connectors";
	}

	if (
		u.includes("ai-sdk") ||
		u.includes("mcp") ||
		u.includes("hosted") ||
		u.includes("intelligence") ||
		u.includes("memory-intelligence") ||
		u.includes("sync") ||
		u.includes("rollback") ||
		u.includes("org-core") ||
		u.includes("webhooks")
	) {
		return "frameworks";
	}

	return "agents";
}

function getBrandName(slug: string, title: string): string {
	const map: Record<string, string> = {
		"claude-code": "Claude Code",
		cursor: "Cursor",
		codex: "OpenAI Codex",
		copilot: "GitHub Copilot",
		cline: "Cline",
		aider: "Aider",
		antigravity: "Antigravity",
		gemini: "Google Gemini",
		windsurf: "Windsurf",
		opencode: "OpenCode",
		"kilo-code": "Kilo Code",
		jetbrains: "JetBrains",
		"amazon-q": "Amazon Q",
		zed: "Zed",
		"command-code": "Command Code",
		"ai-sdk": "Vercel AI SDK",
		"github-connector": "GitHub",
		"linear-connector": "Linear",
		"notion-connector": "Notion",
		"gh-pr-summaries": "GitHub Actions",
		"hosted-mcp": "Hosted MCP",
		"memory-intelligence": "Memory Intelligence",
		"org-core-memory": "Enterprise Core",
		rollback: "Memory Rollback",
		sync: "Cloud Sync",
		webhooks: "Webhooks",
	};

	return (
		map[slug] || title.replace(/^How to (use|connect) MemoFS (with|to) /i, "")
	);
}

function BrandIcon({ slug }: { slug: string }) {
	// SVG mini brand indicators
	if (slug === "claude-code") {
		return (
			<span className="flex size-4 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-600 dark:text-amber-400">
				C
			</span>
		);
	}
	if (slug === "cursor") {
		return (
			<span className="flex size-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-black">
				▲
			</span>
		);
	}
	if (
		slug === "copilot" ||
		slug === "github-connector" ||
		slug === "gh-pr-summaries"
	) {
		return (
			<span className="flex size-4 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-white dark:bg-zinc-200 dark:text-black">
				⌥
			</span>
		);
	}
	if (slug === "linear-connector") {
		return (
			<span className="flex size-4 items-center justify-center rounded-full bg-indigo-500/10 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
				L
			</span>
		);
	}
	if (slug === "notion-connector") {
		return (
			<span className="flex size-4 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-800 dark:bg-zinc-800 dark:text-white">
				N
			</span>
		);
	}
	if (slug === "gemini" || slug === "antigravity") {
		return (
			<span className="flex size-4 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-400">
				G
			</span>
		);
	}
	return (
		<span className="flex size-4 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
			◈
		</span>
	);
}

export function CookbookIndex() {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("all");

	// Get all cookbook recipe pages from source
	const recipes = useMemo(() => {
		return source
			.getPages()
			.filter(
				(p) =>
					p.url.startsWith("/docs/cookbooks/") &&
					p.url !== "/docs/cookbooks" &&
					p.url !== "/docs/cookbooks/index",
			)
			.map((p) => {
				const slug = p.slugs[p.slugs.length - 1] || "";
				const title = p.data.title || slug;
				const category = getRecipeCategory(p.url, title);
				const extra = p.data as unknown as Record<string, unknown>;
				const isComingSoon = extra.status === "coming-soon";
				const estimatedMinutes =
					typeof extra.estimatedMinutes === "number" ||
					typeof extra.estimatedMinutes === "string"
						? String(extra.estimatedMinutes)
						: String(Math.max(2, Math.min(8, Math.round(title.length / 10))));

				return {
					url: p.url,
					slug,
					title,
					description: p.data.description,
					category,
					brand: getBrandName(slug, title),
					isComingSoon,
					estimatedMinutes,
				};
			})
			.sort((a, b) => {
				if (a.isComingSoon !== b.isComingSoon) {
					return a.isComingSoon ? 1 : -1;
				}
				return a.title.localeCompare(b.title);
			});
	}, []);

	// Category counts
	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = { all: recipes.length };
		for (const r of recipes) {
			counts[r.category] = (counts[r.category] || 0) + 1;
		}
		return counts;
	}, [recipes]);

	// Filtered list based on search and category
	const filtered = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return recipes.filter((r) => {
			const matchesCategory =
				selectedCategory === "all" || r.category === selectedCategory;
			if (!matchesCategory) return false;

			if (!query) return true;
			return (
				r.title.toLowerCase().includes(query) ||
				r.brand.toLowerCase().includes(query) ||
				(r.description?.toLowerCase().includes(query) ?? false) ||
				r.slug.toLowerCase().includes(query)
			);
		});
	}, [recipes, searchQuery, selectedCategory]);

	return (
		<div className="not-prose w-full space-y-8">
			{/* Filter Controls: Category Pills + Search Bar */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-dashed border-zinc-200 dark:border-zinc-800/80 pb-6">
				{/* Category Pills with counts */}
				<div className="flex flex-wrap items-center gap-2">
					{CATEGORIES.map((cat) => {
						const isActive = selectedCategory === cat.id;
						const count = categoryCounts[cat.id] || 0;
						return (
							<button
								key={cat.id}
								type="button"
								onClick={() => setSelectedCategory(cat.id)}
								className={`inline-flex items-center gap-1.5 cursor-pointer rounded border px-3 py-1.5 text-xs font-semibold transition-all ${
									isActive
										? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black shadow-sm"
										: "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200"
								}`}
							>
								<span>{cat.name}</span>
								<span
									className={`rounded px-1.5 py-0.2 font-mono text-[10px] ${
										isActive
											? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800"
											: "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
									}`}
								>
									{count}
								</span>
							</button>
						);
					})}
				</div>

				{/* Search Field */}
				<div className="relative w-full sm:w-72">
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search by agent, IDE, or tool..."
						className="w-full rounded border border-zinc-200 bg-white px-3 py-1.5 pl-8 text-xs text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-600"
					/>
					<svg
						className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<title>Search</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>
			</div>

			{/* Recipe Cards Grid (3 per row on desktop) */}
			{filtered.length > 0 ? (
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((recipe) => (
						<Link
							key={recipe.url}
							to={recipe.url}
							className={`group relative flex flex-col justify-between rounded-lg border border-dashed p-6 transition-all duration-200 hover:-translate-y-1 ${
								recipe.isComingSoon
									? "border-zinc-300/70 bg-zinc-50/40 opacity-75 hover:opacity-100 dark:border-zinc-800/70 dark:bg-zinc-950/30"
									: "border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/70 dark:hover:border-zinc-600"
							}`}
						>
							{recipe.isComingSoon && (
								<span className="absolute right-3.5 top-3.5 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
									Coming Soon
								</span>
							)}

							<div>
								{/* Header / Meta */}
								<div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
									<span className="font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
										How-To Guide
									</span>
									<span>·</span>
									<span>{recipe.estimatedMinutes} min read</span>
								</div>

								{/* Card Title */}
								<h3 className="mt-3 text-base font-bold leading-snug text-zinc-900 group-hover:text-black dark:text-zinc-100 dark:group-hover:text-white transition-colors">
									{recipe.title}
								</h3>

								{/* Description */}
								{recipe.description && (
									<p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 font-normal">
										{recipe.description}
									</p>
								)}
							</div>

							{/* Card Footer */}
							<div className="mt-6 flex items-center justify-between border-t border-dashed border-zinc-100 dark:border-zinc-800/80 pt-4 text-xs">
								<div className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
									<BrandIcon slug={recipe.slug} />
									<span>{recipe.brand}</span>
								</div>
								<span className="inline-flex items-center font-semibold text-zinc-600 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-white transition-colors">
									{recipe.isComingSoon ? "Preview" : "Read Guide"}
									<span className="ml-1 transition-transform group-hover:translate-x-1">
										→
									</span>
								</span>
							</div>
						</Link>
					))}
				</div>
			) : (
				<div className="rounded-lg border border-dashed border-zinc-200 p-16 text-center dark:border-zinc-800">
					<p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
						No cookbooks found matching "{searchQuery}"
					</p>
					<p className="mt-1 text-xs text-zinc-500">
						Try adjusting your search query or selecting a different category.
					</p>
				</div>
			)}
		</div>
	);
}
