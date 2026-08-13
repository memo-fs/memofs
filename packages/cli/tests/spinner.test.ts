import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import {
	CliProgressBar,
	CliSpinner,
	createProgressBar,
	createSpinner,
} from "../src/output/spinner";

class MockStream extends EventEmitter implements NodeJS.WritableStream {
	writable = true;
	isTTY = false;
	output: string[] = [];

	write(chunk: string | Uint8Array | unknown): boolean {
		this.output.push(String(chunk));
		return true;
	}

	end(): this {
		return this;
	}
}

describe("CliSpinner", () => {
	it("outputs plain text when non-TTY or json mode is active", () => {
		const stream = new MockStream();
		stream.isTTY = false;

		const spinner = new CliSpinner({ stream, json: true });
		spinner.start("Loading data...");
		spinner.succeed("Data loaded successfully");

		const combined = stream.output.join("");
		expect(combined).toMatch(/Data loaded successfully/);
	});

	it("creates spinner via helper function", () => {
		const stream = new MockStream();
		const spinner = createSpinner({ stream, noColor: true });
		spinner.start("Processing task...");
		spinner.stop();

		expect(stream.output.length).toBeGreaterThan(0);
	});
});

describe("CliProgressBar", () => {
	it("renders milestone progress updates in non-TTY mode", () => {
		const stream = new MockStream();
		stream.isTTY = false;

		const progress = new CliProgressBar({ stream });
		progress.update(1, 5, "File 1");
		progress.update(5, 5, "File 5");

		const combined = stream.output.join("");
		expect(combined).toMatch(/\[1\/5\] \(20%\) File 1/);
		expect(combined).toMatch(/\[5\/5\] \(100%\) File 5/);
	});

	it("creates progress bar via helper function", () => {
		const stream = new MockStream();
		const progress = createProgressBar({ stream, noColor: true });
		progress.update(2, 4, "Item 2");
		progress.stop();

		expect(stream.output.length).toBeGreaterThan(0);
	});
});
