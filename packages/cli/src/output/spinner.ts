/**
 * Zero-dependency native Node.js TTY spinner and progress bar engine.
 *
 * @module spinner
 */

import readline from "node:readline";

/**
 * Options for configuring spinner or progress bar output behavior.
 */
export interface SpinnerOptions {
	/**
	 * Force disable ANSI colors and TTY animations.
	 */
	noColor?: boolean;
	/**
	 * If true, completely silences visual animations (for `--json` mode).
	 */
	json?: boolean;
	/**
	 * Explicit target writable stream (defaults to process.stderr).
	 */
	stream?: NodeJS.WritableStream & { isTTY?: boolean };
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const ANSI = {
	reset: "\x1b[0m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	dim: "\x1b[2m",
	hideCursor: "\x1b[?25l",
	showCursor: "\x1b[?25h",
};

/**
 * Ensures terminal cursor is visible on exit.
 */
export function restoreTerminalCursor(
	stream: NodeJS.WritableStream = process.stderr,
): void {
	if ((stream as { isTTY?: boolean }).isTTY) {
		stream.write(ANSI.showCursor);
	}
}

/**
 * Native TTY Spinner instance.
 */
export class CliSpinner {
	private timer: NodeJS.Timeout | null = null;
	private frameIndex = 0;
	private text = "";
	private readonly stream: NodeJS.WritableStream & { isTTY?: boolean };
	private readonly isInteractive: boolean;
	private readonly disabledColor: boolean;

	constructor(options?: SpinnerOptions) {
		this.stream = options?.stream ?? process.stderr;
		const isTTY = Boolean(this.stream.isTTY);
		const noColorEnv = "NO_COLOR" in process.env || process.env.TERM === "dumb";
		this.disabledColor = Boolean(options?.noColor || noColorEnv);
		this.isInteractive = isTTY && !options?.json;
	}

	/**
	 * Starts the spinner animation with the given message text.
	 */
	start(text: string): this {
		this.text = text;
		if (!this.isInteractive) {
			this.stream.write(`${text}\n`);
			return this;
		}

		this.stop();
		this.stream.write(ANSI.hideCursor);
		this.render();

		this.timer = setInterval(() => {
			this.frameIndex = (this.frameIndex + 1) % SPINNER_FRAMES.length;
			this.render();
		}, 80);

		return this;
	}

	/**
	 * Updates the current message text without resetting the spinner animation.
	 */
	update(text: string): this {
		this.text = text;
		if (this.isInteractive) {
			this.render();
		}
		return this;
	}

	/**
	 * Stops the spinner with a green success badge (✔).
	 */
	succeed(text?: string): void {
		const message = text ?? this.text;
		this.stop();
		const symbol = this.disabledColor ? "✓" : `${ANSI.green}✓${ANSI.reset}`;
		this.stream.write(`${symbol} ${message}\n`);
	}

	/**
	 * Stops the spinner with a red failure badge (✖).
	 */
	fail(text?: string): void {
		const message = text ?? this.text;
		this.stop();
		const symbol = this.disabledColor ? "✖" : `${ANSI.red}✖${ANSI.reset}`;
		this.stream.write(`${symbol} ${message}\n`);
	}

	/**
	 * Stops the spinner animation and restores cursor visibility.
	 */
	stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		if (this.isInteractive) {
			this.clearLine();
			this.stream.write(ANSI.showCursor);
		}
	}

	private render(): void {
		const frame = SPINNER_FRAMES[this.frameIndex] ?? "⠋";
		const symbol = this.disabledColor
			? frame
			: `${ANSI.cyan}${frame}${ANSI.reset}`;
		this.clearLine();
		this.stream.write(`${symbol} ${this.text}`);
	}

	private clearLine(): void {
		if (typeof readline.clearLine === "function") {
			readline.clearLine(this.stream, 0);
			readline.cursorTo(this.stream, 0);
		} else {
			this.stream.write("\r\x1b[K");
		}
	}
}

/**
 * Native TTY Progress Bar instance.
 */
export class CliProgressBar {
	private readonly stream: NodeJS.WritableStream & { isTTY?: boolean };
	private readonly isInteractive: boolean;
	private readonly disabledColor: boolean;

	constructor(options?: SpinnerOptions) {
		this.stream = options?.stream ?? process.stderr;
		const isTTY = Boolean(this.stream.isTTY);
		const noColorEnv = "NO_COLOR" in process.env || process.env.TERM === "dumb";
		this.disabledColor = Boolean(options?.noColor || noColorEnv);
		this.isInteractive = isTTY && !options?.json;
	}

	/**
	 * Renders progress bar state: current item, total items, and label.
	 */
	update(current: number, total: number, label: string): void {
		if (total <= 0) return;
		const percent = Math.min(
			100,
			Math.max(0, Math.round((current / total) * 100)),
		);

		if (!this.isInteractive) {
			if (
				current === total ||
				current % Math.max(1, Math.floor(total / 5)) === 0
			) {
				this.stream.write(`[${current}/${total}] (${percent}%) ${label}\n`);
			}
			return;
		}

		const barLength = 16;
		const filled = Math.round((percent / 100) * barLength);
		const empty = barLength - filled;
		const bar = "█".repeat(filled) + "░".repeat(empty);

		const coloredBar = this.disabledColor
			? bar
			: `${ANSI.cyan}${bar}${ANSI.reset}`;
		const counter = `[${current}/${total}]`;
		const percentText = `${percent}%`;

		this.clearLine();
		this.stream.write(ANSI.hideCursor);
		this.stream.write(
			`${coloredBar} ${percentText.padStart(4)} ${counter} ${label}`,
		);

		if (current >= total) {
			this.clearLine();
			this.stream.write(ANSI.showCursor);
		}
	}

	/**
	 * Completes the progress bar and restores terminal cursor.
	 */
	stop(): void {
		if (this.isInteractive) {
			this.clearLine();
			this.stream.write(ANSI.showCursor);
		}
	}

	private clearLine(): void {
		if (typeof readline.clearLine === "function") {
			readline.clearLine(this.stream, 0);
			readline.cursorTo(this.stream, 0);
		} else {
			this.stream.write("\r\x1b[K");
		}
	}
}

/**
 * Helper to create a new CliSpinner.
 */
export function createSpinner(options?: SpinnerOptions): CliSpinner {
	return new CliSpinner(options);
}

/**
 * Helper to create a new CliProgressBar.
 */
export function createProgressBar(options?: SpinnerOptions): CliProgressBar {
	return new CliProgressBar(options);
}
