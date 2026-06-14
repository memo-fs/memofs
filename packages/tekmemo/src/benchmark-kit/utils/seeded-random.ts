export class SeededRandom {
	private state: number;

	constructor(seed = 123456789) {
		this.state = seed >>> 0;
	}

	next(): number {
		this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
		return this.state / 0xffffffff;
	}

	int(min: number, max: number): number {
		return Math.floor(this.next() * (max - min + 1)) + min;
	}

	pick<T>(items: readonly T[]): T {
		if (items.length === 0) throw new Error("Cannot pick from empty array.");
		const item = items[this.int(0, items.length - 1)];
		if (item === undefined) throw new Error("Cannot pick an undefined item.");
		return item;
	}
}
