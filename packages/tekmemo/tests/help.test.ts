import { describe, expect, it } from "vitest";
import { runTekMemoCli } from "../src";

const pkg = await import("../package.json", { with: { type: "json" } }).then(
	(m) => m.default,
);

describe("help and version", () => {
	it("shows help", async () => {
		const result = await runTekMemoCli({ argv: ["--help"] });
		expect(result.exitCode).toBe(0);
		expect(result.stdout.join("\n")).toContain("tekmemo");
	});

	it("returns error for unknown command", async () => {
		const result = await runTekMemoCli({ argv: ["unknown"] });
		expect(result.exitCode).toBe(1);
		expect(result.stderr.join("\n")).toContain("unknown command");
	});

	it("shows version", async () => {
		const result = await runTekMemoCli({ argv: ["--version"] });
		expect(result.exitCode).toBe(0);
		expect(result.stdout.join("\n")).toContain(pkg.version);
	});
});
