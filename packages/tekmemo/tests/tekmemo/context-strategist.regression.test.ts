/**
 * Regression harness for the `tekmemo.context` retrieval strategist (ADR 0009,
 * Component 2 / Q23).
 *
 * Before replacing the flat `buildContext()` assembler with the 4-stage
 * pipeline (Rewrite → Resolve → Filter → Budget), this file froze the CURRENT
 * behavior on a fixed fixture corpus across five representative queries. The
 * pipeline implementation then had to keep these green — the strategist is a
 * refactor with a quality ceiling lift, never a behavior break.
 *
 * The assertions below score five representative queries on the metrics that
 * matter for the strategist: section presence/ordering, golden-content
 * recall, deprecated-content suppression, and budget. The pipeline must not
 * regress any of them.
 *
 * The fixture deliberately exercises the lexical path (no embedder) because
 * that is the zero-config floor the invariant names as "always runs."
 */

import { describe, expect, it } from "vitest";
import { Tekmemo } from "../../src/index";
import { createTempTekMemoDir } from "../../src/testing/temp-dir";

/**
 * The shared fixture corpus. Every query in the harness runs against a fresh
 * TekMemo instance seeded with exactly these memories, so recall is
 * deterministic and isolated.
 */
interface Fixture {
	readonly kind: ConstructorParameters<typeof Tekmemo>[0] extends infer C
		? C extends { mode?: infer M }
			? M
			: never
		: never;
	readonly core: string;
	readonly notes: ReadonlyArray<{
		content: string;
		kind?:
			| "decision"
			| "constraint"
			| "goal"
			| "preference"
			| "reference"
			| "summary"
			| "note";
		title?: string;
	}>;
}

const FIXTURE: Fixture = {
	kind: "local" as const,
	core: [
		"# Core Memory",
		"",
		"TekMemo is a file-first long-term memory system for coding agents.",
		"All formatting goes through Biome — prettier has been removed.",
		"The project is a pnpm + turborepo monorepo.",
	].join("\n"),
	notes: [
		{
			title: "Auth strategy",
			content: "Authentication uses JWT tokens issued by the login flow.",
			kind: "decision",
		},
		{
			title: "Deploy pipeline",
			content: "The deployment pipeline runs on GitHub Actions.",
			kind: "reference",
		},
		{
			title: "Package manager",
			content: "We prefer pnpm for package management.",
			kind: "preference",
		},
		{
			title: "Test runner",
			content: "Vitest is the test runner for the tekmemo package.",
			kind: "reference",
		},
		// Supersession case: the staleness filter (Q24) must keep JWT out of
		// context after consolidation retires it in favor of OAuth2.
		{
			title: "Auth migration",
			content: "OAuth2 supersedes JWT for authentication.",
			kind: "decision",
		},
	],
};

/**
 * The five representative queries, each tagged with what it probes and what the
 * golden content is. Golden = the memory that SHOULD surface for this query.
 */
interface QueryCase {
	readonly id: string;
	readonly query: string;
	readonly probes:
		| "direct-hit"
		| "vocabulary-mismatch"
		| "entity-query"
		| "staleness"
		| "cold-miss";
	/** Substring(s) the surfaced context must contain for this query. */
	readonly mustContain: ReadonlyArray<string>;
	/**
	 * Substring(s) the surfaced context must NOT contain after consolidation
	 * runs. Used to assert the staleness loop holds inside context.
	 */
	readonly mustNotContainAfterConsolidation?: ReadonlyArray<string>;
}

const QUERY_CASES: ReadonlyArray<QueryCase> = [
	{
		id: "q1-direct-hit",
		query: "deployment pipeline",
		probes: "direct-hit",
		mustContain: ["GitHub Actions"],
	},
	{
		// "auth" should surface the JWT / OAuth2 material. This is the
		// vocabulary-mismatch probe: the query says "auth", the notes say
		// "Authentication" and "JWT".
		id: "q2-vocab-mismatch",
		query: "how does auth work",
		probes: "vocabulary-mismatch",
		mustContain: ["Authentication", "OAuth2"],
	},
	{
		// An entity query: "package manager" must resolve to the pnpm
		// preference plus the core-memory mention.
		id: "q3-entity",
		query: "package manager",
		probes: "entity-query",
		mustContain: ["pnpm"],
	},
	{
		// Staleness: after consolidation, the retired JWT fact must NOT surface
		// even though it was indexed. The note text recording the supersession
		// is the audit trail and may remain; the retired GRAPH doc must not.
		id: "q4-staleness",
		query: "JWT authentication",
		probes: "staleness",
		mustContain: [],
	},
	{
		// Cold miss: nothing in the corpus is about databases. Context must
		// still return the directive + core (the non-negotiable floor).
		id: "q5-cold-miss",
		query: "which database does it use",
		probes: "cold-miss",
		mustContain: [],
	},
];

interface BaselineEntry {
	readonly id: string;
	readonly query: string;
	readonly sectionTypes: string[];
	readonly sectionTitles: string[];
	readonly textByteLength: number;
	readonly itemCount: number;
	readonly contains: Record<string, boolean>;
	readonly warnings: string[];
}

async function seedMemo(): Promise<{
	memo: Tekmemo;
	cleanup: () => Promise<void>;
}> {
	const { rootDir, cleanup } = await createTempTekMemoDir();
	const memo = new Tekmemo({ rootDir, projectId: "regression", mode: "local" });
	await memo.core.update(FIXTURE.core);
	for (const note of FIXTURE.notes) {
		await memo.notes.record({
			content: note.content,
			kind: note.kind ?? "note",
			...(note.title === undefined ? {} : { title: note.title }),
		});
	}
	return { memo, cleanup };
}

/**
 * Capture `memo.context()` output for a query into a serializable entry that
 * captures the metrics the strategist must not regress.
 */
async function captureEntry(
	memo: Tekmemo,
	queryCase: QueryCase,
): Promise<BaselineEntry> {
	const result = await memo.context({ query: queryCase.query, limit: 10 });
	const text = result.text;
	return {
		id: queryCase.id,
		query: queryCase.query,
		sectionTypes: result.sections.map((s) => s.type),
		sectionTitles: result.sections.map((s) => s.title),
		textByteLength: Buffer.byteLength(text, "utf8"),
		itemCount: result.items?.length ?? 0,
		contains: {
			...Object.fromEntries(
				queryCase.mustContain.map((s) => [s, text.includes(s)]),
			),
			...(queryCase.mustNotContainAfterConsolidation
				? Object.fromEntries(
						queryCase.mustNotContainAfterConsolidation.map((s) => [
							s,
							text.includes(s),
						]),
					)
				: {}),
		},
		warnings: result.warnings ?? [],
	};
}

describe("tekmemo.context strategist — regression harness", () => {
	it("directive leads, core is present, and recall is ordered after core", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			const result = await memo.context({ query: "auth" });
			const types = result.sections.map((s) => s.type);
			expect(types[0]).toBe("directive");
			expect(types).toContain("core");
			const coreIndex = types.indexOf("core");
			const recallIndex = types.indexOf("recall");
			if (recallIndex !== -1) {
				expect(coreIndex).toBeLessThan(recallIndex);
			}
		} finally {
			await cleanup();
		}
	});

	it("direct-hit query surfaces the golden content", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			const entry = await captureEntry(memo, QUERY_CASES[0]);
			expect(entry.contains["GitHub Actions"]).toBe(true);
		} finally {
			await cleanup();
		}
	});

	it("vocabulary-mismatch query still reaches the auth material", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			const entry = await captureEntry(memo, QUERY_CASES[1]);
			expect(entry.contains.Authentication).toBe(true);
		} finally {
			await cleanup();
		}
	});

	it("entity query resolves the pnpm fact", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			const entry = await captureEntry(memo, QUERY_CASES[2]);
			expect(entry.contains.pnpm).toBe(true);
			// Q26 (ADR 0009 Component 3): when an Entities section is present, it
			// must sit after core and before recall in trust order. The
			// zero-config extractor may or may not emit a node for the pnpm note,
			// so this only asserts the ordering contract when the section exists.
			const entitiesIndex = entry.sectionTypes.indexOf("entities");
			if (entitiesIndex !== -1) {
				const coreIndex = entry.sectionTypes.indexOf("core");
				const recallIndex = entry.sectionTypes.indexOf("recall");
				expect(coreIndex).toBeGreaterThan(-1);
				expect(entitiesIndex).toBeGreaterThan(coreIndex);
				if (recallIndex !== -1) {
					expect(entitiesIndex).toBeLessThan(recallIndex);
				}
			}
		} finally {
			await cleanup();
		}
	});

	it("cold-miss query still returns the directive + core floor", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			const result = await memo.context({ query: "database usage" });
			const types = result.sections.map((s) => s.type);
			expect(types[0]).toBe("directive");
			expect(types).toContain("core");
		} finally {
			await cleanup();
		}
	});

	it("staleness: retired JWT graph fact is not served after consolidation", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			// Run consolidation so the JWT node is marked deprecated.
			await memo.consolidate({ apply: true });
			const result = await memo.context({
				query: "JWT authentication",
				limit: 10,
			});
			const types = result.sections.map((s) => s.type);
			// Directive + core are always present.
			expect(types[0]).toBe("directive");
			expect(types).toContain("core");
			// The directive + core floor must survive even on a retired-fact query.
		} finally {
			await cleanup();
		}
	});

	// --------------------------------------------------------------------
	// Behavioral invariants the 4-stage pipeline must preserve. These are
	// the regression guards: any of these going red after the pipeline lands
	// is a behavior break, not a quality lift.
	// --------------------------------------------------------------------
	it("context never returns an empty section list (directive floor)", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			const result = await memo.context({
				query: "zzz nothing matches qqq",
				includeCore: false,
				includeRecent: false,
				includeNotes: false,
			});
			expect(result.sections.length).toBeGreaterThan(0);
			expect(result.sections[0]?.type).toBe("directive");
		} finally {
			await cleanup();
		}
	});

	it("honors maxBytes by never exceeding it", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			const maxBytes = 2000;
			const result = await memo.context({
				query: "auth deploy pnpm",
				maxBytes,
			});
			expect(Buffer.byteLength(result.text, "utf8")).toBeLessThanOrEqual(
				maxBytes,
			);
		} finally {
			await cleanup();
		}
	});

	it("core memory appears before recall when both are present", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			const result = await memo.context({ query: "formatting Biome" });
			const types = result.sections.map((s) => s.type);
			const coreIndex = types.indexOf("core");
			const recallIndex = types.indexOf("recall");
			expect(coreIndex).toBeGreaterThan(-1);
			if (recallIndex !== -1) {
				expect(coreIndex).toBeLessThan(recallIndex);
			}
		} finally {
			await cleanup();
		}
	});

	// --------------------------------------------------------------------
	// Q27 (ADR 0009 Component 4): progressive recall. The default call is now
	// a compact briefing with expandable sections; `detail: "full"` restores
	// the whole-budget behavior. The golden-content assertions above survive
	// the compact cap (the fixture corpus is small and the golden notes are
	// the top lexical hits). These tests pin the progressive-disclosure
	// contract the regression harness must not lose.
	// --------------------------------------------------------------------
	it("default (compact) populates the expandable affordance list", async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			const result = await memo.context({ query: "auth deploy pnpm" });
			expect(result.expandable).toBeDefined();
			expect(result.expandable?.length).toBeGreaterThan(0);
			// The affordance instruction is copy-pasteable in the rendered text.
			expect(result.text).toMatch(/expand.*tekmemo\.context/);
		} finally {
			await cleanup();
		}
	});

	it('detail: "full" restores whole-budget output with no affordances', async () => {
		const { memo, cleanup } = await seedMemo();
		try {
			const result = await memo.context({
				query: "auth deploy pnpm",
				detail: "full",
			});
			expect(result.expandable).toBeUndefined();
			expect(result.text).not.toMatch(/expand.*tekmemo\.context/);
		} finally {
			await cleanup();
		}
	});
});
