import { describe, expect, it } from "vitest";
import { SeededRandom } from "../../src";

describe("SeededRandom", () => {
	it("is deterministic", () => {
		const a = new SeededRandom(1);
		const b = new SeededRandom(1);

		expect([a.next(), a.next(), a.next()]).toEqual([
			b.next(),
			b.next(),
			b.next(),
		]);
	});

	it("picks from list", () => {
		const rng = new SeededRandom(1);
		expect(["a", "b", "c"]).toContain(rng.pick(["a", "b", "c"]));
	});
});
