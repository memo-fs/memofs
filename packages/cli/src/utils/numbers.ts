import { CliUsageError } from "../errors/cli-errors";

export function parseNonNegativeInteger(value: string, name = "value"): number {
	const parsed = Number.parseInt(value, 10);
	if (
		!Number.isFinite(parsed) ||
		parsed < 0 ||
		String(parsed) !== String(value).trim()
	) {
		throw new CliUsageError(`${name} must be a non-negative integer.`);
	}
	return parsed;
}

export function parsePositiveInteger(value: string, name = "value"): number {
	const parsed = parseNonNegativeInteger(value, name);
	if (parsed === 0) throw new CliUsageError(`${name} must be greater than 0.`);
	return parsed;
}

export function parseConfidence(value: string): number {
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
		throw new CliUsageError("confidence must be a number between 0 and 1.");
	}
	return parsed;
}
