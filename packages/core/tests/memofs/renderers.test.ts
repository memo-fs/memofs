/**
 * Unit tests for the context-section text renderers — `renderRecall` and
 * `buildStaleRecallBanner`. These pin the consumer-facing contract for the
 * rendered recall text: scores, code-anchor binding sites, and drift
 * annotations. Anchored and stale items still surface in recall (so the
 * next agent session can re-verify), but the rendered text must tell the
 * reading model that drift happened instead of leaving it to inspect the
 * structured `RecallItem` payload.
 */

import { describe, expect, it } from "vitest";
import type { RecallItem } from "../../src/index";
import {
	buildStaleRecallBanner,
	renderRecall,
	STALE_REVERIFY_MESSAGE,
} from "../../src/memofs/helpers/renderers";

/** Minimal factory — only the fields the renderers read are required. */
function item(partial: Partial<RecallItem> & { text: string }): RecallItem {
	return {
		id: partial.id ?? "mem_test",
		text: partial.text,
		...(partial.score === undefined ? {} : { score: partial.score }),
		...(partial.anchor === undefined ? {} : { anchor: partial.anchor }),
		...(partial.stale === undefined ? {} : { stale: partial.stale }),
	};
}

describe("renderRecall — text-rendering contract", () => {
	it("renders an empty list as the empty string", () => {
		expect(renderRecall([])).toBe("");
	});

	it("renders a plain item (no score/anchor/stale) as a numbered line", () => {
		const rendered = renderRecall([item({ text: "Auth uses JWT." })]);
		expect(rendered).toBe("1. Auth uses JWT.");
	});

	it("appends the score line when a score is present", () => {
		const rendered = renderRecall([item({ text: "t", score: 0.42 })]);
		expect(rendered).toBe("1. t\n score: 0.42");
	});

	it("appends [anchor: <file>] when an anchor is present without a symbol", () => {
		const rendered = renderRecall([
			item({
				text: "Auth flow lives in the provider.",
				anchor: { file: "src/auth/provider.ts", hash: "a".repeat(64) },
			}),
		]);
		expect(rendered).toContain("1. Auth flow lives in the provider.");
		expect(rendered).toContain("\n [anchor: src/auth/provider.ts]");
	});

	it("appends [anchor: <file>#<symbol>] when the anchor carries a symbol", () => {
		const rendered = renderRecall([
			item({
				text: "verifyJwt is the entry point.",
				anchor: {
					file: "src/auth/provider.ts",
					hash: "b".repeat(64),
					symbol: "verifyJwt",
				},
			}),
		]);
		expect(rendered).toContain("\n [anchor: src/auth/provider.ts#verifyJwt]");
	});

	it("appends the [stale] marker with re-verify guidance when stale is true", () => {
		const rendered = renderRecall([
			item({ text: "Anchored fact that drifted.", stale: true }),
		]);
		expect(rendered).toContain(`\n [stale] ${STALE_REVERIFY_MESSAGE}`);
	});

	it("does not emit the [stale] marker for falsy stale values", () => {
		expect(renderRecall([item({ text: "fresh", stale: false })])).not.toContain(
			"[stale]",
		);
		expect(
			renderRecall([item({ text: "fresh", stale: undefined })]),
		).not.toContain("[stale]");
	});

	it("emits both [anchor] and [stale] for a drifted anchored item, in that order", () => {
		const rendered = renderRecall([
			item({
				text: "JWT validation anchor drifted.",
				anchor: {
					file: "auth.py",
					hash: "c".repeat(64),
					symbol: "validate_token",
				},
				stale: true,
			}),
		]);
		const anchorIdx = rendered.indexOf("[anchor:");
		const staleIdx = rendered.indexOf("[stale]");
		expect(anchorIdx).toBeGreaterThan(-1);
		expect(staleIdx).toBeGreaterThan(-1);
		expect(anchorIdx).toBeLessThan(staleIdx);
	});

	it("joins multiple items with a blank line", () => {
		const rendered = renderRecall([
			item({ text: "first" }),
			item({ text: "second", score: 0.1 }),
		]);
		expect(rendered).toBe("1. first\n\n2. second\n score: 0.1");
	});

	it("orders the per-item lines as text → score → anchor → stale", () => {
		const rendered = renderRecall([
			item({
				text: "fully-annotated drifted item",
				score: 0.5,
				anchor: { file: "f.ts", hash: "d".repeat(64) },
				stale: true,
			}),
		]);
		// The four pieces appear in the documented order.
		const textIdx = rendered.indexOf("fully-annotated drifted item");
		const scoreIdx = rendered.indexOf("score:");
		const anchorIdx = rendered.indexOf("[anchor:");
		const staleIdx = rendered.indexOf("[stale]");
		expect(textIdx).toBeLessThan(scoreIdx);
		expect(scoreIdx).toBeLessThan(anchorIdx);
		expect(anchorIdx).toBeLessThan(staleIdx);
	});
});

describe("buildStaleRecallBanner — strategist stale banner", () => {
	it("returns the empty string when no items are stale", () => {
		expect(
			buildStaleRecallBanner([
				item({ text: "fresh", stale: false }),
				item({ text: "fresh", stale: undefined }),
			]),
		).toBe("");
	});

	it("returns the empty string for an empty list", () => {
		expect(buildStaleRecallBanner([])).toBe("");
	});

	it("emits a count banner when some items are stale", () => {
		const banner = buildStaleRecallBanner([
			item({ text: "fresh" }),
			item({ text: "drifted", stale: true }),
			item({ text: "drifted", stale: true }),
		]);
		expect(banner).toBe(
			"[stale] 2 of 3 recall fragments are anchored to files that changed since write — re-verify each before trusting.\n\n",
		);
	});

	it("emits a full-count banner when every item is stale", () => {
		const banner = buildStaleRecallBanner([
			item({ text: "drifted", stale: true }),
			item({ text: "drifted", stale: true }),
		]);
		expect(banner.startsWith("[stale] 2 of 2 recall fragments")).toBe(true);
		expect(banner.endsWith("\n\n")).toBe(true);
	});
});
