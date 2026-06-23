import { expect } from "vitest";

export function expectFiniteNumber(value: unknown): asserts value is number {
	expect(typeof value).toBe("number");
	expect(Number.isFinite(value)).toBe(true);
}

export function expectVector(
	value: unknown,
	dimensions?: number,
): asserts value is number[] {
	expect(Array.isArray(value)).toBe(true);

	const vector = value as number[];
	expect(vector.length).toBeGreaterThan(0);

	if (dimensions !== undefined) {
		expect(vector).toHaveLength(dimensions);
	}

	for (const item of vector) {
		expectFiniteNumber(item);
	}
}

export function expectSortedDescending(values: readonly number[]): void {
	for (let i = 1; i < values.length; i += 1) {
		const previous = values[i - 1];
		const current = values[i];
		if (previous === undefined || current === undefined) {
			throw new Error("Expected adjacent values for sort assertion.");
		}
		expect(previous).toBeGreaterThanOrEqual(current);
	}
}

export function expectNoMutation<T>(before: T, after: T): void {
	expect(after).toEqual(before);
}

export function cloneForMutationCheck<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
