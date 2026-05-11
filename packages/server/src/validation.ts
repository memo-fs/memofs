import { TekMemoServerValidationError } from "./errors.js";
import type { JsonObject, MemoryKind } from "./types.js";

const memoryKinds = new Set<MemoryKind>([
	"decision",
	"constraint",
	"goal",
	"preference",
	"reference",
	"summary",
	"note",
]);

export function assertObject(
	value: unknown,
	fieldName: string,
): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new TekMemoServerValidationError(`${fieldName} must be an object.`);
	}
	return value as Record<string, unknown>;
}

export function assertProjectId(value: unknown): string {
	if (typeof value !== "string" || !value.trim()) {
		throw new TekMemoServerValidationError(
			"projectId must be a non-empty string.",
		);
	}
	return value.trim();
}

export function optionalPositiveInt(
	value: unknown,
	fieldName: string,
): number | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	const numberValue = typeof value === "string" ? Number(value) : value;
	if (!Number.isInteger(numberValue) || Number(numberValue) <= 0) {
		throw new TekMemoServerValidationError(
			`${fieldName} must be a positive integer.`,
		);
	}
	return Number(numberValue);
}

export function optionalString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function optionalMemoryKind(value: unknown): MemoryKind | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	if (typeof value !== "string" || !memoryKinds.has(value as MemoryKind)) {
		throw new TekMemoServerValidationError(
			"kind must be a valid TekMemo memory kind.",
		);
	}
	return value as MemoryKind;
}

export function optionalStringArray(
	value: unknown,
	fieldName: string,
): string[] | undefined {
	if (value === undefined || value === null) return undefined;
	if (
		!Array.isArray(value) ||
		!value.every((item) => typeof item === "string")
	) {
		throw new TekMemoServerValidationError(
			`${fieldName} must be an array of strings.`,
		);
	}
	return value.map((item) => item.trim()).filter(Boolean);
}

export function optionalConfidence(value: unknown): number | undefined {
	if (value === undefined || value === null) return undefined;
	if (
		typeof value !== "number" ||
		Number.isNaN(value) ||
		value < 0 ||
		value > 1
	) {
		throw new TekMemoServerValidationError(
			"confidence must be a number between 0 and 1.",
		);
	}
	return value;
}

export function optionalMetadata(value: unknown): JsonObject | undefined {
	if (value === undefined || value === null) return undefined;
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new TekMemoServerValidationError("metadata must be a JSON object.");
	}
	return value as JsonObject;
}
