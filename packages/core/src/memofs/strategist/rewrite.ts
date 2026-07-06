import type { RewriteInput, RewriteResult } from "./types";

interface LexiconEntry {
	trigger: string;
	expansions: string[];
}

const REWRITE_LEXICON: ReadonlyArray<LexiconEntry> = [
	{ trigger: "auth", expansions: ["authentication", "jwt", "oauth", "login"] },
	{ trigger: "authentication", expansions: ["auth", "jwt", "oauth", "login"] },
	{ trigger: "login", expansions: ["authentication", "auth"] },
	{ trigger: "db", expansions: ["database", "postgres", "sqlite", "turso"] },
	{ trigger: "database", expansions: ["db", "postgres", "sqlite"] },
	{ trigger: "deps", expansions: ["dependency", "dependencies", "package"] },
	{ trigger: "dependency", expansions: ["dependencies", "deps", "package"] },
	{ trigger: "ci", expansions: ["continuous integration", "github actions"] },
	{ trigger: "cd", expansions: ["continuous deployment", "deploy"] },
	{ trigger: "deploy", expansions: ["deployment", "ci", "release"] },
	{ trigger: "deployment", expansions: ["deploy", "release"] },
	{ trigger: "test", expansions: ["testing", "vitest", "jest", "spec"] },
	{ trigger: "tests", expansions: ["testing", "vitest", "spec"] },
	{ trigger: "fmt", expansions: ["format", "formatting", "biome", "prettier"] },
	{ trigger: "format", expansions: ["formatting", "biome", "prettier"] },
	{ trigger: "formatting", expansions: ["format", "biome"] },
	{ trigger: "pkg", expansions: ["package", "pnpm", "npm"] },
	{ trigger: "package", expansions: ["pkg", "pnpm", "npm"] },
	{ trigger: "config", expansions: ["configuration"] },
];

const TOKEN_SPLIT = /[\s,./\\[\]{}()<>:;'"!?|`~@#$%^&*+=—–-]+/u;

export function tokenize(query: string): string[] {
	const raw = query.toLowerCase().split(TOKEN_SPLIT);
	const out: string[] = [];
	for (const token of raw) {
		if (token.length === 0) continue;
		out.push(token);
	}
	return out;
}

export function rewriteQuery(input: RewriteInput): RewriteResult {
	const tokens = tokenize(input.query);
	const expanded = new Set<string>(tokens);
	for (const token of tokens) {
		const entry = REWRITE_LEXICON.find((e) => e.trigger === token);
		if (entry === undefined) continue;
		for (const expansion of entry.expansions) {
			expanded.add(expansion.toLowerCase());
		}
	}
	for (const extra of input.adapterExpansions ?? []) {
		expanded.add(extra.toLowerCase());
	}
	return {
		original: input.query,
		tokens,
		expandedTerms: [...expanded],
		expanded: expanded.size > tokens.length,
	};
}
