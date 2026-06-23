import { describe, expect, it } from "vitest";
import { createBufferedOutput } from "../src/output/output";

describe("createBufferedOutput", () => {
	it("captures stdout and stderr", () => {
		const output = createBufferedOutput({ noColor: true });
		output.write("hello");
		output.error("oops");
		expect(output.stdout).toEqual(["hello"]);
		expect(output.stderr).toEqual(["oops"]);
	});

	it("formats success messages", () => {
		const output = createBufferedOutput({ noColor: true });
		output.success("done");
		expect(output.stdout).toEqual(["done"]);
	});

	it("formats warning messages", () => {
		const output = createBufferedOutput({ noColor: true });
		output.warn("careful");
		expect(output.stdout).toEqual(["careful"]);
	});

	it("strips color codes when noColor is true", () => {
		const output = createBufferedOutput({ noColor: true });
		output.error("oops");
		expect(output.stderr[0]).toBe("oops");
	});

	it("includes color codes by default", () => {
		// Color output is environment-dependent (shouldDisableColor honors
		// NO_COLOR and TERM=dumb), so make this test deterministic by forcing a
		// color-capable environment and restoring the original values after.
		const prevTerm = process.env.TERM;
		const hadNoColor = "NO_COLOR" in process.env;
		const prevNoColor = process.env.NO_COLOR;
		process.env.TERM = "xterm-256color";
		delete process.env.NO_COLOR;
		try {
			const output = createBufferedOutput({ noColor: false });
			output.error("oops");
			expect(output.stderr[0]).toContain("\x1b[");
		} finally {
			process.env.TERM = prevTerm;
			if (hadNoColor) process.env.NO_COLOR = prevNoColor;
		}
	});
});
