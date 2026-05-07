import { GraphValidationError } from "../errors/graph-errors.js";
import type { GraphFactStatus } from "../types.js";

export interface TemporalRecord {
	status?: GraphFactStatus;
	validFrom?: string;
	validUntil?: string;
	expiresAt?: string;
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function toDate(
	value: string | Date | undefined,
	fieldName = "date",
): Date | undefined {
	if (value === undefined) return undefined;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new GraphValidationError(`${fieldName} must be a valid ISO date.`);
	}
	return date;
}

export function assertIsoDate(
	value: unknown,
	fieldName: string,
): asserts value is string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new GraphValidationError(`${fieldName} must be an ISO date string.`);
	}
	toDate(value, fieldName);
}

export function isExpired(
	record: TemporalRecord,
	nowInput?: string | Date,
): boolean {
	const now = toDate(nowInput, "now") ?? new Date();

	if (record.expiresAt && toDate(record.expiresAt, "expiresAt")! <= now)
		return true;
	if (record.validFrom && toDate(record.validFrom, "validFrom")! > now)
		return true;
	if (record.validUntil && toDate(record.validUntil, "validUntil")! <= now)
		return true;

	return false;
}

export function isInactive(record: TemporalRecord): boolean {
	return record.status !== undefined && record.status !== "active";
}
