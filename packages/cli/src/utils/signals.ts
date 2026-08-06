/**
 * Terminal signal listener and graceful exit handler.
 *
 * @module signals
 */

import { restoreTerminalCursor } from "../output/spinner";

let registered = false;

/**
 * Registers global listeners for SIGINT and SIGTERM to clean up active
 * TTY spinners and restore cursor visibility before exiting.
 */
export function registerSignalHandlers(
	stream: NodeJS.WritableStream = process.stderr,
): void {
	if (registered) return;
	registered = true;

	const handleExit = (signal: string) => {
		restoreTerminalCursor(stream);
		if ((stream as { isTTY?: boolean }).isTTY) {
			stream.write(
				`\n\x1b[33m[memofs]\x1b[0m Operation cancelled by user (${signal}).\n`,
			);
		}
		process.exit(130);
	};

	process.on("SIGINT", () => handleExit("SIGINT"));
	process.on("SIGTERM", () => handleExit("SIGTERM"));
}
