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
		const output = createBufferedOutput({ noColor: false });
		output.error("oops");
		expect(output.stderr[0]).toContain("\x1b[");
	});
});
