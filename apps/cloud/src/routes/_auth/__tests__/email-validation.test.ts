import { describe, expect, it } from "vitest";

import { isDisposableDomain } from "../+utils/email-validation";

describe("isDisposableDomain", () => {
	it("returns true for known disposable domains", () => {
		expect(isDisposableDomain("mailinator.com")).toBe(true);
		expect(isDisposableDomain("guerrillamail.com")).toBe(true);
		expect(isDisposableDomain("tempmail.com")).toBe(true);
	});

	it("is case-insensitive", () => {
		expect(isDisposableDomain("MAILINATOR.COM")).toBe(true);
		expect(isDisposableDomain("Mailinator.Com")).toBe(true);
	});

	it("returns false for non-disposable domains", () => {
		expect(isDisposableDomain("gmail.com")).toBe(false);
		expect(isDisposableDomain("my-startup.io")).toBe(false);
	});
});
