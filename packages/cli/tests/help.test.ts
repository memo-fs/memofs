import { describe, expect, it } from "vitest";
import { runMemoFsCli } from "../src";

const pkg = await import("../package.json", { with: { type: "json" } }).then(
	(m) => m.default,
);

describe("help and version", () => {
	it("shows help", async () => {
		const result = await runMemoFsCli({ argv: ["--help"] });
		expect(result.exitCode).toBe(0);
		expect(result.stdout.join("\n")).toContain("memofs");
	});

	it("returns error for unknown command", async () => {
		const result = await runMemoFsCli({ argv: ["unknown"] });
		expect(result.exitCode).toBe(1);
		expect(result.stderr.join("\n")).toContain("unknown command");
	});

	it("shows version", async () => {
		const result = await runMemoFsCli({ argv: ["--version"] });
		expect(result.exitCode).toBe(0);
		expect(result.stdout.join("\n")).toContain(pkg.version);
	});
});
