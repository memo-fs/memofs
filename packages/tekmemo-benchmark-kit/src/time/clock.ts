import type { BenchmarkClock } from "../types";

export class SystemBenchmarkClock implements BenchmarkClock {
	now(): number {
		const performanceLike = globalThis as typeof globalThis & {
			performance?: { now?: () => number };
		};

		if (typeof performanceLike.performance?.now === "function") {
			return performanceLike.performance.now();
		}

		return Date.now();
	}
}

export class DeterministicBenchmarkClock implements BenchmarkClock {
	private current: number;
	private step: number;

	constructor(options?: { start?: number; step?: number }) {
		this.current = options?.start ?? 0;
		this.step = options?.step ?? 1;
	}

	now(): number {
		const value = this.current;
		this.current += this.step;
		return value;
	}

	advance(ms: number): void {
		this.current += ms;
	}

	setStep(ms: number): void {
		this.step = ms;
	}
}
