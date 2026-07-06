import { afterEach, describe, expect, it, vi } from "vitest";

import { hasMxRecord } from "../mx-check";

/** Build a JSON Response shaped like Cloudflare DoH. */
function dohResponse(body: unknown, ok = true): Response {
	return new Response(JSON.stringify(body), {
		status: ok ? 200 : 500,
		headers: { "content-type": "application/dns-json" },
	});
}

describe("hasMxRecord", () => {
	const originalFetch = globalThis.fetch;
	const fetchMock = vi.fn();

	afterEach(() => {
		fetchMock.mockReset();
		globalThis.fetch = originalFetch;
	});

	it("returns true when the DoH answer has MX records", async () => {
		fetchMock.mockResolvedValue(
			dohResponse({
				Status: 0,
				Answer: [{ name: "gmail.com", type: 15, TTL: 300, data: "..." }],
			}),
		);
		globalThis.fetch = fetchMock;

		await expect(hasMxRecord("gmail.com")).resolves.toBe(true);
		expect(fetchMock).toHaveBeenCalledOnce();
		const url = String(fetchMock.mock.calls[0][0]);
		expect(url).toContain("name=gmail.com");
		expect(url).toContain("type=MX");
	});

	it("returns false when the answer is empty (NOERROR, no records)", async () => {
		fetchMock.mockResolvedValue(dohResponse({ Status: 0, Answer: [] }));
		globalThis.fetch = fetchMock;

		await expect(hasMxRecord("norecord.test")).resolves.toBe(false);
	});

	it("returns false when Answer is missing", async () => {
		fetchMock.mockResolvedValue(dohResponse({ Status: 0 }));
		globalThis.fetch = fetchMock;

		await expect(hasMxRecord("norecord.test")).resolves.toBe(false);
	});

	it("fails open (true) when the DoH request errors", async () => {
		fetchMock.mockRejectedValue(new Error("network down"));
		globalThis.fetch = fetchMock;

		// A DoH outage must never block signup — see module doc.
		await expect(hasMxRecord("anything.com")).resolves.toBe(true);
	});

	it("fails open (true) on a non-2xx DoH response", async () => {
		fetchMock.mockResolvedValue(dohResponse({}, false));
		globalThis.fetch = fetchMock;

		await expect(hasMxRecord("anything.com")).resolves.toBe(true);
	});

	it("encodes the domain in the query", async () => {
		fetchMock.mockResolvedValue(dohResponse({ Answer: [{ type: 15 }] }));
		globalThis.fetch = fetchMock;

		await hasMxRecord("weird&domain.com");
		const url = String(fetchMock.mock.calls[0][0]);
		expect(url).toContain("name=weird%26domain.com");
	});
});
