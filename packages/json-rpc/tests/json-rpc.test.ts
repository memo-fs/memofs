/**
 * JSON-RPC 2.0 spec conformance for the shared protocol primitives.
 *
 * Covers the shapes + behaviors both consumers (`memofs-server` runtime API,
 * `memofs-mcp-server` transport) rely on: parse/validate/success/failure,
 * notifications, batch arrays, and the five spec error codes. Spec citations
 * reference https://www.jsonrpc.org/specification.
 */
import { describe, expect, it } from "vitest";
import {
	failure,
	isNotification,
	isPlainObject,
	JSON_RPC_ERRORS,
	JsonRpcProtocolError,
	parseJsonRpcPayload,
	success,
	validateJsonRpcRequest,
} from "../src";

describe("parseJsonRpcPayload", () => {
	it("parses a valid JSON string", () => {
		expect(parseJsonRpcPayload('{"jsonrpc":"2.0"}')).toEqual({
			jsonrpc: "2.0",
		});
	});

	it("parses a JSON array (batch)", () => {
		expect(parseJsonRpcPayload('[{"jsonrpc":"2.0"}]')).toEqual([
			{ jsonrpc: "2.0" },
		]);
	});

	it("throws JsonRpcProtocolError mapped to parseError on invalid JSON", () => {
		expect(() => parseJsonRpcPayload("{not json")).toThrowError(
			JsonRpcProtocolError,
		);
		try {
			parseJsonRpcPayload("nope");
		} catch (err) {
			expect(err).toBeInstanceOf(JsonRpcProtocolError);
			expect((err as JsonRpcProtocolError).jsonRpcCode).toBe(
				JSON_RPC_ERRORS.parseError,
			);
		}
	});
});

describe("validateJsonRpcRequest", () => {
	it("accepts a well-formed request", () => {
		const value = {
			jsonrpc: "2.0",
			id: 1,
			method: "recall",
			params: { query: "x" },
		};
		expect(validateJsonRpcRequest(value)).toEqual(value);
	});

	it("accepts a notification (no id)", () => {
		const req = validateJsonRpcRequest({
			jsonrpc: "2.0",
			method: "ping",
		});
		expect(req.id).toBeUndefined();
	});

	it.each([
		["null", null],
		["an array", [{ jsonrpc: "2.0" }]],
		["a string", "jsonrpc:2.0"],
	])("rejects a non-object value (%s)", (_label, bad) => {
		expect(() => validateJsonRpcRequest(bad)).toThrowError(
			JsonRpcProtocolError,
		);
		expect(() => validateJsonRpcRequest(bad)).toThrowError(
			/JSON-RPC request must be an object/,
		);
	});

	it("rejects a wrong protocol version (invalidRequest)", () => {
		expect(() =>
			validateJsonRpcRequest({ jsonrpc: "1.0", method: "x" }),
		).toThrowError(/version must be 2.0/);
	});

	it("rejects a missing method (invalidRequest)", () => {
		expect(() =>
			validateJsonRpcRequest({ jsonrpc: "2.0", id: 1 }),
		).toThrowError(/method is required/);
	});

	it("rejects an empty-string method (invalidRequest)", () => {
		expect(() =>
			validateJsonRpcRequest({ jsonrpc: "2.0", method: "" }),
		).toThrowError(/method is required/);
	});

	it("rejects a non-string/number/null id (invalidRequest)", () => {
		expect(() =>
			validateJsonRpcRequest({
				jsonrpc: "2.0",
				method: "x",
				id: { no: true },
			}),
		).toThrowError(/id must be string, number, or null/);
	});

	it("accepts a null id (spec-legal)", () => {
		expect(
			validateJsonRpcRequest({ jsonrpc: "2.0", method: "x", id: null }).id,
		).toBeNull();
	});

	it("rejects a non-object params (invalidParams)", () => {
		try {
			validateJsonRpcRequest({
				jsonrpc: "2.0",
				method: "x",
				params: ["positional"],
			});
			throw new Error("should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(JsonRpcProtocolError);
			expect((err as JsonRpcProtocolError).jsonRpcCode).toBe(
				JSON_RPC_ERRORS.invalidParams,
			);
		}
	});

	it("sets the correct jsonRpcCode for shape violations (invalidRequest)", () => {
		try {
			validateJsonRpcRequest({ jsonrpc: "1.0" });
			throw new Error("should have thrown");
		} catch (err) {
			expect((err as JsonRpcProtocolError).jsonRpcCode).toBe(
				JSON_RPC_ERRORS.invalidRequest,
			);
		}
	});
});

describe("isNotification", () => {
	it("is true when id is absent", () => {
		expect(isNotification({ jsonrpc: "2.0", method: "ping" })).toBe(true);
	});

	it("is false when id is present", () => {
		expect(isNotification({ jsonrpc: "2.0", id: 5, method: "ping" })).toBe(
			false,
		);
	});

	it("is false when id is null (spec: null id is still an id)", () => {
		expect(isNotification({ jsonrpc: "2.0", id: null, method: "ping" })).toBe(
			false,
		);
	});
});

describe("success / failure envelopes", () => {
	it("success builds the spec success object", () => {
		expect(success(7, { ok: true })).toEqual({
			jsonrpc: "2.0",
			id: 7,
			result: { ok: true },
		});
	});

	it("failure builds the spec error object with code + message", () => {
		expect(
			failure(2, JSON_RPC_ERRORS.methodNotFound, "Method not found."),
		).toEqual({
			jsonrpc: "2.0",
			id: 2,
			error: { code: -32601, message: "Method not found." },
		});
	});

	it("failure includes data when provided", () => {
		expect(
			failure(2, JSON_RPC_ERRORS.invalidParams, "bad", { field: "q" }),
		).toEqual({
			jsonrpc: "2.0",
			id: 2,
			error: { code: -32602, message: "bad", data: { field: "q" } },
		});
	});

	it("failure omits data when undefined", () => {
		const res = failure(0, JSON_RPC_ERRORS.internalError, "boom");
		expect("data" in res.error).toBe(false);
	});
});

describe("JSON_RPC_ERRORS — all five spec codes present", () => {
	it("exposes the spec-defined codes verbatim", () => {
		expect(JSON_RPC_ERRORS).toEqual({
			parseError: -32700,
			invalidRequest: -32600,
			methodNotFound: -32601,
			invalidParams: -32602,
			internalError: -32603,
		});
	});
});

describe("isPlainObject", () => {
	it.each([
		["plain object", {}, true],
		["null-prototype object", Object.create(null), true],
		["null", null, false],
		["array", [], false],
		["string", "x", false],
		["number", 1, false],
		["Date", new Date(), false],
	])("isPlainObject(%s) === %s", (_label, value, expected) => {
		expect(isPlainObject(value)).toBe(expected);
	});
});
