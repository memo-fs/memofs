import { describe, expect, it } from "vitest";
import {
	MAX_BODY_CHARS,
	normalizeNotionPage,
	parseDatabaseId,
	resolveQuery,
} from "../../../src/connectors/notion/normalize";
import type {
	NotionPage,
	NotionSourceMapping,
} from "../../../src/connectors/notion/types";

function page(overrides: Partial<NotionPage> = {}): NotionPage {
	return {
		id: "0123456789abcdef0123456789abcdef",
		title: "Q3 Roadmap",
		url: "https://www.notion.so/0123456789abcdef0123456789abcdef",
		createdAt: "2026-01-15T10:00:00.000Z",
		...(overrides as Record<string, unknown>),
	} as NotionPage;
}

describe("normalizeNotionPage", () => {
	it("produces a stable externalId `notion:<pageId>`", () => {
		const r = normalizeNotionPage(page());
		expect(r.externalId).toBe("notion:0123456789abcdef0123456789abcdef");
	});

	it("title + url land in content as markdown", () => {
		const r = normalizeNotionPage(page());
		expect(r.content).toContain("# Q3 Roadmap");
		expect(r.content).toContain("https://www.notion.so/");
	});

	it("uses 'Untitled' when the title is empty", () => {
		const r = normalizeNotionPage(page({ title: "" }));
		expect(r.title).toBe("Untitled");
		expect(r.content).toContain("# Untitled");
	});

	it("carries createdAt, lastEditedAt, createdBy, properties in metadata", () => {
		const r = normalizeNotionPage(
			page({
				lastEditedAt: "2026-02-01T00:00:00.000Z",
				createdBy: "user-1",
				properties: { Status: "In Progress", Owner: "alice" },
			}),
		);
		expect(r.metadata).toMatchObject({
			kind: "page",
			createdAt: "2026-01-15T10:00:00.000Z",
			lastEditedAt: "2026-02-01T00:00:00.000Z",
			createdBy: "user-1",
			properties: { Status: "In Progress", Owner: "alice" },
		});
	});

	it("omits empty metadata branches", () => {
		const r = normalizeNotionPage(page());
		expect(r.metadata).toMatchObject({
			kind: "page",
			createdAt: "2026-01-15T10:00:00.000Z",
		});
		expect(r.metadata).not.toHaveProperty("properties");
		expect(r.metadata).not.toHaveProperty("lastEditedAt");
		expect(r.metadata).not.toHaveProperty("createdBy");
	});

	it("occurredAt mirrors createdAt", () => {
		const r = normalizeNotionPage(page());
		expect(r.occurredAt).toBe("2026-01-15T10:00:00.000Z");
	});

	it("truncates bodies longer than MAX_BODY_CHARS", () => {
		const long = "x".repeat(MAX_BODY_CHARS + 100);
		const r = normalizeNotionPage(page({ body: long }));
		expect(r.content).toContain("…");
		const bodyLine = r.content.split("\n\n")[1] ?? "";
		expect(bodyLine.length).toBeLessThanOrEqual(MAX_BODY_CHARS + 1);
	});

	it("produces distinct externalIds per page id", () => {
		const a = normalizeNotionPage(page({ id: "a".repeat(32) }));
		const b = normalizeNotionPage(page({ id: "b".repeat(32) }));
		expect(a.externalId).not.toBe(b.externalId);
	});
});

describe("parseDatabaseId", () => {
	it("accepts a 32-char hex id (no hyphens)", () => {
		const id = "0123456789abcdef0123456789abcdef";
		const sm: NotionSourceMapping = { databaseId: id };
		expect(parseDatabaseId(sm)).toBe(id);
	});

	it("accepts a hyphenated 8-4-4-4-12 id", () => {
		const id = "01234567-89ab-cdef-0123-456789abcdef";
		const sm: NotionSourceMapping = { databaseId: id };
		expect(parseDatabaseId(sm)).toBe(id);
	});

	it("throws when databaseId is missing", () => {
		expect(() => parseDatabaseId(undefined)).toThrow(/databaseId/);
		expect(() => parseDatabaseId({})).toThrow(/databaseId/);
	});

	it("throws on a non-hex id", () => {
		const sm = {
			databaseId: "not-hex-not-hex-not-hex-not-he!",
		} as unknown as NotionSourceMapping;
		expect(() => parseDatabaseId(sm)).toThrow(/32 hex/);
	});

	it("throws on a too-short id", () => {
		const sm = { databaseId: "0123" } as unknown as NotionSourceMapping;
		expect(() => parseDatabaseId(sm)).toThrow(/32 hex/);
	});

	it("throws on an empty id", () => {
		const sm: NotionSourceMapping = { databaseId: "" };
		expect(() => parseDatabaseId(sm)).toThrow(/databaseId/);
	});
});

describe("resolveQuery", () => {
	it("prefers databaseId when present", () => {
		const sm: NotionSourceMapping = {
			databaseId: "0123456789abcdef0123456789abcdef",
			searchQuery: "ignored",
		};
		const q = resolveQuery(sm);
		expect(q.kind).toBe("database");
		expect(q.databaseId).toBe("0123456789abcdef0123456789abcdef");
	});

	it("falls back to searchQuery when databaseId is absent", () => {
		const sm: NotionSourceMapping = { searchQuery: "roadmap" };
		const q = resolveQuery(sm);
		expect(q.kind).toBe("search");
		expect(q.searchQuery).toBe("roadmap");
	});

	it("throws when neither databaseId nor searchQuery is set", () => {
		expect(() => resolveQuery({})).toThrow(/databaseId.*searchQuery/);
		expect(() => resolveQuery(undefined)).toThrow(/databaseId.*searchQuery/);
	});

	it("throws when searchQuery is empty and no databaseId", () => {
		const sm: NotionSourceMapping = { searchQuery: "" };
		expect(() => resolveQuery(sm)).toThrow(/databaseId.*searchQuery/);
	});
});
