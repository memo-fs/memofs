import { expect, test } from "vitest";
import {
	assertNonEmptyString,
	normalizeBatchSize,
	omitUndefined,
} from "./index";

test("assertNonEmptyString returns trimmed valid strings", () => {
	expect(() => assertNonEmptyString(" tekmemo ", "label")).not.toThrow();
});

test("normalizeBatchSize applies defaults and bounds", () => {
	expect(normalizeBatchSize(undefined, 1, 10, 4)).toBe(4);
	expect(() => normalizeBatchSize(25, 1, 10, 4)).toThrow(
		"batchSize must be <= 10.",
	);
});

test("omitUndefined strips undefined entries but keeps falsy values", () => {
	const result = omitUndefined({
		a: 1,
		b: undefined,
		c: 0,
		d: "",
		e: false,
		f: null,
	});
	expect(result).toEqual({ a: 1, c: 0, d: "", e: false, f: null });
	expect("b" in result).toBe(false);
});
