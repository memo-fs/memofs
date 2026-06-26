import * as React from "react";

export type TypingPhase = "typing" | "running" | "note" | "done";

/** Base per-character delay (ms); jitter is added on top for a human cadence. */
const TYPE_MS = 42;
const TYPE_JITTER = 40;
/** Pause after the command "runs" before its output streams in. */
const RUN_PAUSE = 420;
/** Dwell on the output before moving to the next command. */
const NOTE_PAUSE = 650;
/** Beat between finishing one row and starting the next prompt. */
const ROW_GAP = 340;

export interface TypingState {
	row: number;
	char: number;
	phase: TypingPhase;
}

/**
 * Drives a command-by-command "typing" sequence for the animated terminal:
 * types each command character-by-character (with jitter), pauses as if it is
 * running, streams its output note, then advances to the next row. Idle until
 * `enabled` flips true (e.g. when the terminal scrolls into view) and latches
 * on `done` once the last row's output has shown.
 *
 * `lengths` must be a stable (memoized) array of command character counts so
 * the scheduler isn't reset by unrelated parent re-renders.
 */
export function useTerminalTyping(lengths: number[], enabled: boolean) {
	const [state, setState] = React.useState<TypingState>({
		row: 0,
		char: 0,
		phase: "typing",
	});

	React.useEffect(() => {
		if (!enabled || state.phase === "done") return;

		const cmdLength = lengths[state.row] ?? 0;
		let delay: number;
		let next: TypingState;

		if (state.phase === "typing") {
			if (state.char < cmdLength) {
				delay = TYPE_MS + Math.random() * TYPE_JITTER;
				next = { ...state, char: state.char + 1 };
			} else {
				delay = RUN_PAUSE;
				next = { ...state, phase: "running" };
			}
		} else if (state.phase === "running") {
			delay = NOTE_PAUSE;
			next = { ...state, phase: "note" };
		} else {
			const isLast = state.row >= lengths.length - 1;
			delay = isLast ? 0 : ROW_GAP;
			next = isLast
				? { ...state, phase: "done" }
				: { row: state.row + 1, char: 0, phase: "typing" };
		}

		const id = window.setTimeout(() => setState(next), delay);
		return () => window.clearTimeout(id);
	}, [state, enabled, lengths]);

	return state;
}
