import { describe, expect, it } from "vitest";

import {
	emailDomain,
	emailIssueMessage,
	validateEmail,
} from "../+utils/email-validation";

describe("validateEmail", () => {
	it("accepts a well-formed address", () => {
		expect(validateEmail(" user@example.com ")).toEqual({ ok: true });
	});

	it("lowercases before checking", () => {
		// Disposable check is case-sensitive on the stored lowercase set; ensure
		// uppercase input still trips it rather than slipping through.
		expect(validateEmail("x@MAILINATOR.com")).toEqual({
			ok: false,
			issue: { kind: "disposable", domain: "mailinator.com" },
		});
	});

	it.each([
		["", "empty"],
		["no-at-sign.com", "missing @"],
		["user@", "missing domain"],
		["@example.com", "missing local"],
		["user@plainaddress", "missing TLD"],
		["user@.com", "leading-dot domain"],
		["user name@example.com", "embedded space"],
	])("rejects %s (%s)", (input) => {
		expect(validateEmail(input)).toEqual({
			ok: false,
			issue: { kind: "invalid" },
		});
	});

	it("rejects a disposable domain", () => {
		expect(validateEmail("a@guerrillamail.com")).toEqual({
			ok: false,
			issue: { kind: "disposable", domain: "guerrillamail.com" },
		});
	});

	it("lets a non-disposable custom domain through format+disposable layers", () => {
		// MX is the caller's job — validateEmail must not claim the domain is ok
		// beyond format/disposable. Here it legitimately returns ok.
		expect(validateEmail("dev@my-startup.io")).toEqual({ ok: true });
	});
});

describe("emailDomain", () => {
	it("extracts the lowercased domain", () => {
		expect(emailDomain("Hello@Gmail.com")).toBe("gmail.com");
	});

	it("returns null for an address that fails the format check", () => {
		expect(emailDomain("not-an-email")).toBeNull();
	});
});

describe("emailIssueMessage", () => {
	it("names the disposable provider", () => {
		expect(
			emailIssueMessage({ kind: "disposable", domain: "tempmail.com" }),
		).toContain("tempmail.com");
	});

	it("names the no-mx domain", () => {
		expect(emailIssueMessage({ kind: "no-mx", domain: "dead.tld" })).toContain(
			"dead.tld",
		);
	});

	it("gives a generic invalid message", () => {
		expect(emailIssueMessage({ kind: "invalid" })).toMatch(/valid email/i);
	});
});
