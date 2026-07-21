import type { TaskType } from "../types";
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

const TASK_TYPE_EXPANSIONS: Record<Exclude<TaskType, "general">, string[]> = {
	coding: [
		"constraint",
		"rule",
		"convention",
		"pattern",
		"standard",
		"style",
		"guideline",
	],
	debug: [
		"error",
		"bug",
		"fix",
		"exception",
		"crash",
		"failure",
		"stack trace",
		"debug",
		"issue",
	],
	refactor: [
		"architecture",
		"refactor",
		"structure",
		"design",
		"pattern",
		"dependency",
		"coupling",
		"interface",
		"module",
	],
	docs: [
		"api",
		"documentation",
		"docs",
		"interface",
		"contract",
		"type",
		"schema",
		"readme",
	],
};

/**
 * Phrases prepended to the recall query per task type, per ADR 0020 ID5.
 * These steer the recall engine toward the most relevant memories before
 * lexicon expansion adds synonyms.
 */
const TASK_TYPE_QUERY_PREPENDS: Record<Exclude<TaskType, "general">, string> = {
	coding: "Constraints, patterns, and recent decisions",
	debug: "Recent errors and bug-fix context",
	refactor: "Architecture decisions and dependency graph",
	docs: "Public API contracts and documentation decisions",
};

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
	const prepend =
		input.taskType !== undefined && input.taskType !== "general"
			? TASK_TYPE_QUERY_PREPENDS[input.taskType]
			: "";
	const query = prepend ? `${prepend} ${input.query}` : input.query;
	const tokens = tokenize(query);
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
	if (input.taskType && input.taskType !== "general") {
		for (const term of TASK_TYPE_EXPANSIONS[input.taskType]) {
			expanded.add(term.toLowerCase());
		}
	}
	return {
		original: input.query,
		tokens,
		expandedTerms: [...expanded],
		expanded: expanded.size > tokens.length,
	};
}
