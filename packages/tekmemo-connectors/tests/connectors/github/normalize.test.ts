import { describe, expect, it } from "vitest";
import {
	DEFAULT_GITHUB_KINDS,
	MAX_BODY_CHARS,
	normalizeGitHubNode,
	parseRepository,
	resolveKinds,
} from "../../../src/connectors/github/normalize";
import type {
	GitHubNode,
	GitHubSourceMapping,
} from "../../../src/connectors/github/types";

function node(overrides: Partial<GitHubNode> = {}): GitHubNode {
	return {
		kind: "issues",
		number: 42,
		title: "Bug: login fails",
		body: "Login returns 500.",
		url: "https://github.com/owner/repo/issues/42",
		state: "OPEN",
		author: "alice",
		labels: ["bug", "p1"],
		createdAt: "2026-01-01T00:00:00Z",
		...(overrides as Record<string, unknown>),
	} as GitHubNode;
}

describe("normalizeGitHubNode", () => {
	it("produces a stable externalId `<kind>:<number>`", () => {
		const r = normalizeGitHubNode(node(), "owner/repo");
		expect(r.externalId).toBe("issues:42");
	});

	it("title + body + url land in content as markdown", () => {
		const r = normalizeGitHubNode(node(), "owner/repo");
		expect(r.content).toContain("# Bug: login fails");
		expect(r.content).toContain("Login returns 500.");
		expect(r.content).toContain("https://github.com/owner/repo/issues/42");
	});

	it("carries repository, number, state, author, labels, kind in metadata", () => {
		const r = normalizeGitHubNode(node(), "owner/repo");
		expect(r.metadata).toMatchObject({
			repository: "owner/repo",
			number: 42,
			state: "OPEN",
			author: "alice",
			labels: ["bug", "p1"],
			kind: "issues",
		});
	});

	it("occurredAt mirrors createdAt", () => {
		const r = normalizeGitHubNode(node(), "owner/repo");
		expect(r.occurredAt).toBe("2026-01-01T00:00:00Z");
	});

	it("handles a missing body (empty content section)", () => {
		const r = normalizeGitHubNode(node({ body: undefined }), "owner/repo");
		expect(r.content).toContain("# Bug: login fails");
		expect(r.content).not.toContain("undefined");
	});

	it("handles a null state", () => {
		const r = normalizeGitHubNode(node({ state: null }), "owner/repo");
		expect(r.metadata?.state).toBeNull();
	});

	it("truncates bodies longer than MAX_BODY_CHARS", () => {
		const long = "x".repeat(MAX_BODY_CHARS + 100);
		const r = normalizeGitHubNode(node({ body: long }), "owner/repo");
		expect(r.content).toContain("…");
		// The body portion (between the title and the "Source:" line) is capped.
		const bodyLine = r.content.split("\n\n")[1] ?? "";
		expect(bodyLine.length).toBeLessThanOrEqual(MAX_BODY_CHARS + 1); // +1 for ellipsis
	});

	it("produces distinct externalIds per kind", () => {
		const issue = normalizeGitHubNode(
			node({ kind: "issues", number: 7 }),
			"o/r",
		);
		const pr = normalizeGitHubNode(node({ kind: "prs", number: 7 }), "o/r");
		const disc = normalizeGitHubNode(
			node({ kind: "discussions", number: 7 }),
			"o/r",
		);
		expect(issue.externalId).toBe("issues:7");
		expect(pr.externalId).toBe("prs:7");
		expect(disc.externalId).toBe("discussions:7");
	});
});

describe("resolveKinds", () => {
	it("defaults to issues + prs + discussions", () => {
		expect(resolveKinds(undefined)).toEqual([...DEFAULT_GITHUB_KINDS]);
		expect(resolveKinds({})).toEqual([...DEFAULT_GITHUB_KINDS]);
	});

	it("honors an explicit kinds subset", () => {
		const sm: GitHubSourceMapping = { repository: "o/r", kinds: ["issues"] };
		expect(resolveKinds(sm)).toEqual(["issues"]);
	});

	it("throws on an unknown kind", () => {
		const sm = {
			repository: "o/r",
			kinds: ["weird"],
		} as unknown as GitHubSourceMapping;
		expect(() => resolveKinds(sm)).toThrow(/Unknown GitHub connector kind/);
	});
});

describe("parseRepository", () => {
	it("parses owner/repo", () => {
		const sm: GitHubSourceMapping = { repository: "octocat/hello-world" };
		expect(parseRepository(sm)).toEqual({
			owner: "octocat",
			repo: "hello-world",
			repository: "octocat/hello-world",
		});
	});

	it("throws when repository is missing", () => {
		expect(() => parseRepository(undefined)).toThrow(/owner\/repo/);
		expect(() => parseRepository({})).toThrow(/owner\/repo/);
	});

	it("throws on a malformed repository (no slash)", () => {
		const sm: GitHubSourceMapping = { repository: "no-slash" };
		expect(() => parseRepository(sm)).toThrow(/owner\/repo/);
	});

	it("throws on a repository with too many slashes", () => {
		const sm: GitHubSourceMapping = { repository: "a/b/c" };
		expect(() => parseRepository(sm)).toThrow(/owner\/repo/);
	});

	it("throws on an empty repository", () => {
		const sm: GitHubSourceMapping = { repository: "" };
		expect(() => parseRepository(sm)).toThrow(/owner\/repo/);
	});
});
