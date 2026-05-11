import { describe, expect, it } from "vitest";
import { runTekMemoCli } from "../src";

describe("CLI argument handling", () => {
	it("passes root and json flags", async () => {
		const result = await runTekMemoCli({ argv: ["inspect", "--json"] });
		expect(result.exitCode).toBe(0);
		expect(result.stdout.join("\n")).toContain('"');
	});

	it("shows help when --help is passed", async () => {
		const result = await runTekMemoCli({ argv: ["--help"] });
		expect(result.exitCode).toBe(0);
	});

	it("returns error for unknown flags on commands", async () => {
		const result = await runTekMemoCli({ argv: ["inspect", "--bogus"] });
		expect(result.exitCode).toBe(1);
	});
});
