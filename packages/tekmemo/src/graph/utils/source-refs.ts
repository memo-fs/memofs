import { GraphValidationError } from "../errors/graph-errors";
import type { GraphSourceRef } from "../types";
import { cloneJson, isPlainObject, uniqueStrings } from "./clone";
import { cloneAndValidateMetadata } from "./metadata";

const MAX_SOURCE_REFS = 32;
const MAX_SOURCE_TEXT = 1024;
const SAFE_HTTP_PROTOCOLS = new Set(["http:", "https:"]);

export function cloneAndValidateSourceRefs(
	input: unknown,
	fieldName = "sourceRefs",
): GraphSourceRef[] | undefined {
	if (input === undefined) return undefined;
	if (!Array.isArray(input))
		throw new GraphValidationError(`${fieldName} must be an array.`);
	if (input.length > MAX_SOURCE_REFS)
		throw new GraphValidationError(
			`${fieldName} can contain at most ${MAX_SOURCE_REFS} entries.`,
		);

	const out = input.map((item, index) => {
		if (!isPlainObject(item)) {
			throw new GraphValidationError(
				`${fieldName}[${index}] must be a plain object.`,
			);
		}

		const ref = item as unknown as GraphSourceRef;
		if (
			typeof ref.sourceType !== "string" ||
			ref.sourceType.trim().length === 0
		) {
			throw new GraphValidationError(
				`${fieldName}[${index}].sourceType is required.`,
			);
		}

		assertOptionalSafeText(ref.sourceId, `${fieldName}[${index}].sourceId`);
		assertOptionalSafeText(ref.title, `${fieldName}[${index}].title`);

		if (ref.path !== undefined)
			validateSafePath(ref.path, `${fieldName}[${index}].path`);
		if (ref.url !== undefined)
			validateSafeUrl(ref.url, `${fieldName}[${index}].url`);

		if (ref.span !== undefined) {
			if (!isPlainObject(ref.span))
				throw new GraphValidationError(
					`${fieldName}[${index}].span must be a plain object.`,
				);
			const span = ref.span as Record<string, unknown>;
			for (const key of ["start", "end", "line", "column"]) {
				const value = span[key];
				if (
					value !== undefined &&
					(!Number.isInteger(value) || (value as number) < 0)
				) {
					throw new GraphValidationError(
						`${fieldName}[${index}].span.${key} must be a non-negative integer.`,
					);
				}
			}
			const start = span.start as number | undefined;
			const end = span.end as number | undefined;
			if (start !== undefined && end !== undefined && start > end) {
				throw new GraphValidationError(
					`${fieldName}[${index}].span.start must be less than or equal to span.end.`,
				);
			}
		}

		return {
			...cloneJson(ref),
			sourceType: ref.sourceType.trim(),
			metadata: cloneAndValidateMetadata(
				ref.metadata,
				`${fieldName}[${index}].metadata`,
			),
		} satisfies GraphSourceRef;
	});

	return out.length > 0 ? out : undefined;
}

export function mergeSourceRefs(
	...groups: Array<GraphSourceRef[] | undefined>
): GraphSourceRef[] | undefined {
	const refs: GraphSourceRef[] = [];
	const seen = new Set<string>();

	for (const group of groups) {
		const safeGroup = cloneAndValidateSourceRefs(group) ?? [];
		for (const ref of safeGroup) {
			const key = sourceRefIdentity(ref);
			if (seen.has(key)) continue;
			seen.add(key);
			refs.push(ref);
		}
	}

	return refs.length > 0 ? refs : undefined;
}

export function sourceLabels(refs: GraphSourceRef[] | undefined): string[] {
	return uniqueStrings(
		(refs ?? []).flatMap((ref) => [ref.title, ref.path, ref.sourceId, ref.url]),
	);
}

export function sourceRefsIdentity(
	refs: GraphSourceRef[] | undefined,
): string | undefined {
	const safeRefs = cloneAndValidateSourceRefs(refs) ?? [];
	if (safeRefs.length === 0) return undefined;
	return safeRefs.map(sourceRefIdentity).sort().join("|");
}

function sourceRefIdentity(ref: GraphSourceRef): string {
	return [
		ref.sourceType,
		ref.sourceId ?? "",
		ref.path ?? "",
		ref.url ?? "",
		ref.span?.start ?? "",
		ref.span?.end ?? "",
		ref.span?.line ?? "",
		ref.span?.column ?? "",
	].join("\u001f");
}

function validateSafePath(path: string, fieldName: string): void {
	assertOptionalSafeText(path, fieldName);
	if (path.startsWith("/") || path.startsWith("~"))
		throw new GraphValidationError(`${fieldName} must be relative.`);
	if (path.includes("\\"))
		throw new GraphValidationError(`${fieldName} cannot contain backslashes.`);
	if (path.split("/").some((part) => part === ".."))
		throw new GraphValidationError(
			`${fieldName} cannot contain path traversal.`,
		);
	if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path))
		throw new GraphValidationError(`${fieldName} cannot be a URL/protocol.`);
}

function validateSafeUrl(url: string, fieldName: string): void {
	assertOptionalSafeText(url, fieldName);
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch (error) {
		throw new GraphValidationError(`${fieldName} must be a valid URL.`, {
			cause: error,
		});
	}
	if (!SAFE_HTTP_PROTOCOLS.has(parsed.protocol)) {
		throw new GraphValidationError(`${fieldName} must use http or https.`);
	}
}

function assertOptionalSafeText(value: unknown, fieldName: string): void {
	if (value === undefined) return;
	if (typeof value !== "string")
		throw new GraphValidationError(`${fieldName} must be a string.`);
	if (value.length > MAX_SOURCE_TEXT)
		throw new GraphValidationError(
			`${fieldName} exceeds ${MAX_SOURCE_TEXT} characters.`,
		);
}
