import { describe, expect, it } from "vitest";
import type { MemoryContextResult } from "../src/index";
import { InMemoryMemoryStore, Tekmemo } from "../src/index";

describe("tekmemo.context directive block", () => {
	it("leads the context text and sections with an agent directive", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new Tekmemo({ store });

		// Seed memory so recall/core sections are non-empty.
		await memo.core.update(
			"# Core Memory\n\nAlways use Biome for formatting.\n",
		);
		await memo.writeMemory({
			content:
				"The CLI entry point is `tekmemo` and ships from packages/tekmemo-cli.",
			kind: "reference",
		});

		const result: MemoryContextResult = await memo.context({
			query: "formatting tool",
		});

		// The directive is always emitted first, even before core/recall.
		expect(result.sections[0]?.type).toBe("directive");
		expect(result.sections[0]?.title).toMatch(/How to use TekMemo/i);
		expect(result.sections[0]?.content).toMatch(/single source of truth/i);
		expect(result.sections[0]?.content).toMatch(/tekmemo\.recall/);
		expect(result.sections[0]?.content).toMatch(/tekmemo\.remember/);

		// The directive heading + content are prepended to the rendered text.
		expect(result.text.startsWith("## How to use TekMemo context")).toBe(true);
		expect(result.text).toMatch(/single source of truth/i);

		// Core and recall still appear after the directive.
		const sectionTypes = result.sections.map((s) => s.type);
		expect(sectionTypes).toContain("core");
		expect(sectionTypes).toContain("recall");
		expect(sectionTypes.indexOf("directive")).toBeLessThan(
			sectionTypes.indexOf("core"),
		);
	});

	it("emits the directive even when all other sections are empty", async () => {
		const store = new InMemoryMemoryStore();
		const memo = new Tekmemo({ store });

		const result = await memo.context({
			query: "nothing matches this zzz",
			includeCore: false,
			includeRecent: false,
			includeNotes: false,
		});

		// Directive is the floor: context is never an empty data dump.
		expect(result.sections).toHaveLength(1);
		expect(result.sections[0]?.type).toBe("directive");
		expect(result.text).toMatch(/single source of truth/i);
	});
});
