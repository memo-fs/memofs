import { GraphValidationError } from "../errors/graph-errors";

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9:_./@-]{0,191}$/;
const MAX_DEDUPE_KEY_LENGTH = 512;

export function assertGraphId(
	id: unknown,
	fieldName = "id",
): asserts id is string {
	if (typeof id !== "string" || !SAFE_ID.test(id)) {
		throw new GraphValidationError(
			`${fieldName} must be a non-empty safe graph id.`,
		);
	}

	if (id.includes("..") || id.includes("\\")) {
		throw new GraphValidationError(
			`${fieldName} contains unsafe path-like characters.`,
		);
	}
}

export function assertDedupeKey(
	value: unknown,
	fieldName = "dedupeKey",
): asserts value is string | undefined {
	if (value === undefined) return;
	if (typeof value !== "string")
		throw new GraphValidationError(`${fieldName} must be a string.`);
	const trimmed = value.trim();
	if (!trimmed) throw new GraphValidationError(`${fieldName} cannot be empty.`);
	if (trimmed.length > MAX_DEDUPE_KEY_LENGTH) {
		throw new GraphValidationError(
			`${fieldName} exceeds ${MAX_DEDUPE_KEY_LENGTH} characters.`,
		);
	}
}

export function slugifyGraphPart(input: string): string {
	const slug = input
		.trim()
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);

	return slug || "unknown";
}

export function stableNodeId(type: string, label: string): string {
	return `${slugifyGraphPart(type)}:${slugifyGraphPart(label)}`;
}

export function stableEdgeId(input: {
	from: string;
	type: string;
	to: string;
	directed?: boolean;
	dedupeKey?: string;
}): string {
	const payload = `${input.from}\u001f${input.type}\u001f${input.to}\u001f${input.directed ?? true}\u001f${input.dedupeKey ?? ""}`;
	return `edge:${fnv1a(payload)}`;
}

export function fnv1a(input: string): string {
	let hash = 0x811c9dc5;

	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}

	return (hash >>> 0).toString(16).padStart(8, "0");
}
