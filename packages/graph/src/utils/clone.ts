import { GraphValidationError } from "../errors/graph-errors.js";

export function cloneJson<T>(value: T): T {
	if (value === undefined) return value;
	try {
		return JSON.parse(JSON.stringify(value)) as T;
	} catch (error) {
		throw new GraphValidationError("value must be JSON-serializable.", {
			cause: error,
		});
	}
}

export function uniqueStrings(
	values: Array<string | undefined | null>,
): string[] {
	const out: string[] = [];
	const seen = new Set<string>();

	for (const value of values) {
		if (typeof value !== "string") continue;
		const trimmed = value.trim();
		if (!trimmed) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(trimmed);
	}

	return out;
}

export function assertPlainObject(
	value: unknown,
	fieldName: string,
): asserts value is Record<string, unknown> {
	if (!isPlainObject(value)) {
		throw new GraphValidationError(`${fieldName} must be a plain object.`);
	}
}

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}
