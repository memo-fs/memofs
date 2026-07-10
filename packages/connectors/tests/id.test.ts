import { describe, expect, it } from "vitest";
import { connectorNoteId } from "../src/id";
import type { ConnectorRecord } from "../src/types";

/**
 * Q3: the connector note id is content-derived with no wall-clock in
 * the hashed bytes. Re-ingesting identical external content must reproduce the
 * same id — that's what makes sync-manifest diffs report "no change".
 */
describe("connectorNoteId", () => {
	function record(overrides: Partial<ConnectorRecord> = {}): ConnectorRecord {
		return {
			externalId: "issue:42",
			title: "Bug: login fails",
			content: "Login returns 500 on prod.",
			...(overrides as Record<string, unknown>),
		} as ConnectorRecord;
	}

	it("produces a `conn_<16 hex>` id", () => {
		const id = connectorNoteId(record());
		expect(id).toMatch(/^conn_[0-9a-f]{16}$/);
	});

	it("is deterministic for identical records (no wall-clock)", () => {
		// Two separate calls — if the id were wall-clock-seeded, these would
		// differ. They must be byte-identical.
		const a = connectorNoteId(record());
		const b = connectorNoteId(record());
		expect(a).toBe(b);
	});

	it("changes when externalId changes", () => {
		const a = connectorNoteId(record({ externalId: "issue:42" }));
		const b = connectorNoteId(record({ externalId: "issue:43" }));
		expect(a).not.toBe(b);
	});

	it("changes when content changes", () => {
		const a = connectorNoteId(record({ content: "Login returns 500." }));
		const b = connectorNoteId(record({ content: "Login returns 502." }));
		expect(a).not.toBe(b);
	});

	it("is stable across two distinct record objects with the same fields", () => {
		// Simulating two devices re-ingesting the same external item.
		const device1 = connectorNoteId(
			record({ externalId: "pr:7", content: "Add OAuth" }),
		);
		const device2 = connectorNoteId(
			record({ externalId: "pr:7", content: "Add OAuth" }),
		);
		expect(device1).toBe(device2);
	});

	it("ignores title/url/metadata in the hash (only externalId + content)", () => {
		// Different title/url/metadata but same externalId + content → same id.
		// This is deliberate: re-pushed records may carry refreshed metadata
		// (e.g. a label added) but the underlying fact is unchanged.
		const base = connectorNoteId(record());
		const withExtras = connectorNoteId(
			record({
				title: "Different title",
				url: "https://example.com/x",
				metadata: { extra: true },
			}),
		);
		expect(withExtras).toBe(base);
	});
});
