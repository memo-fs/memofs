import { describe, expect, it } from "vitest";

import { safeRelativeRedirect } from "../session.server";

/**
 * Regression tests for the open-redirect guard (VULN-001).
 *
 * The `callbackURL` that flows into Better Auth's post-login redirect originates
 * from attacker-controlled URL params / form fields. `safeRelativeRedirect` is
 * the gate that keeps it same-origin; these tests pin the policy so a future
 * change that widens it fails here before reaching production.
 */
describe("safeRelativeRedirect", () => {
	it("accepts a same-origin relative path", () => {
		expect(safeRelativeRedirect("/dashboard")).toBe("/dashboard");
		expect(safeRelativeRedirect("/projects/abc")).toBe("/projects/abc");
		expect(safeRelativeRedirect("/")).toBe("/");
	});

	it("rejects an absolute https URL (open-redirect vector)", () => {
		expect(safeRelativeRedirect("https://evil.com")).toBe("/dashboard");
		expect(safeRelativeRedirect("https://evil.com/steal")).toBe("/dashboard");
	});

	it("rejects a protocol-relative URL (resolves to an external host)", () => {
		expect(safeRelativeRedirect("//evil.com")).toBe("/dashboard");
		expect(safeRelativeRedirect("//evil.com/path")).toBe("/dashboard");
	});

	it("rejects a backslash-prefixed URL (browser-normalizes to a host)", () => {
		expect(safeRelativeRedirect("\\evil.com")).toBe("/dashboard");
		expect(safeRelativeRedirect("/\\evil.com")).toBe("/dashboard");
	});

	it("falls back to the default when the input is missing or non-string", () => {
		expect(safeRelativeRedirect(null)).toBe("/dashboard");
		expect(safeRelativeRedirect(undefined)).toBe("/dashboard");
		expect(safeRelativeRedirect("")).toBe("/dashboard");
		// A File entry from formData.get() must not leak through.
		expect(safeRelativeRedirect(new File([], "x") as unknown as string)).toBe(
			"/dashboard",
		);
	});

	it("rejects a scheme other than a single leading slash", () => {
		expect(safeRelativeRedirect("dashboard")).toBe("/dashboard"); // no leading slash
		expect(safeRelativeRedirect("javascript:alert(1)")).toBe("/dashboard");
	});
});
