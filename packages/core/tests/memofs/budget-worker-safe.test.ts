import { describe, expect, it } from "vitest";
import {
	decodeBase64Url,
	encodeBase64Url,
	truncateUtf8,
	utf8ByteLength,
} from "../../src/memofs/helpers/utils";
import {
	decodeExpansionCursor,
	encodeExpansionCursor,
} from "../../src/memofs/progressive";
import { allocateBudget } from "../../src/memofs/strategist/budget";

describe("worker-safe budgeting and cursor (no Buffer)", () => {
	it("budget allocates without Buffer global", () => {
		const originalBuffer = (globalThis as unknown as { Buffer?: unknown })
			.Buffer;
		// biome-ignore lint/suspicious/noExplicitAny: simulate workerd
		(globalThis as any).Buffer = undefined;
		try {
			const result = allocateBudget({
				maxBytes: 500,
				sections: [
					{ title: "Core", content: "core content here", nonNegotiable: true },
					{
						title: "Recall",
						content: "a\nb\nc\nd\ne",
						type: "recall",
						weight: 3,
					},
					{ title: "Notes", content: "note 1\nnote 2", type: "notes" },
				],
			});
			expect(result.text.length).toBeGreaterThan(0);
			expect(result.sections.length).toBeGreaterThan(0);
			// utf8 byte length should match TextEncoder counting
			expect(utf8ByteLength("café")).toBe(5); // c a f + 2 bytes é
		} finally {
			// biome-ignore lint/suspicious/noExplicitAny: restore
			(globalThis as any).Buffer = originalBuffer;
		}
	});

	it("truncateUtf8 and base64url work without Buffer", () => {
		const originalBuffer = (globalThis as unknown as { Buffer?: unknown })
			.Buffer;
		// biome-ignore lint/suspicious/noExplicitAny: simulate workerd
		(globalThis as any).Buffer = undefined;
		try {
			const truncated = truncateUtf8("a".repeat(100), 10);
			expect(truncated).toContain("truncated");

			const payload = JSON.stringify({ v: 1, key: "k", section: "recall" });
			const enc = encodeBase64Url(payload);
			const dec = decodeBase64Url(enc);
			expect(dec).toBe(payload);
		} finally {
			// biome-ignore lint/suspicious/noExplicitAny: restore
			(globalThis as any).Buffer = originalBuffer;
		}
	});

	it("expansion cursor round-trips without Buffer", () => {
		const originalBuffer = (globalThis as unknown as { Buffer?: unknown })
			.Buffer;
		// biome-ignore lint/suspicious/noExplicitAny: simulate workerd
		(globalThis as any).Buffer = undefined;
		try {
			const cursor = encodeExpansionCursor({
				v: 1,
				key: "abc123",
				section: "recall",
			});
			const decoded = decodeExpansionCursor(cursor);
			expect(decoded?.section).toBe("recall");
			expect(decoded?.key).toBe("abc123");
		} finally {
			// biome-ignore lint/suspicious/noExplicitAny: restore
			(globalThis as any).Buffer = originalBuffer;
		}
	});
});
