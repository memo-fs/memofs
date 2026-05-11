import { McpValidationError } from "../errors.js";
import type {
	GraphEdgeInput,
	GraphNodeInput,
	MemoryKind,
	SourceRef,
} from "../types.js";
import { assertJsonValue, isPlainObject, toJsonObject } from "./json.js";

const SAFE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._:@/-]{0,255}$/;
const SAFE_TOKEN_RE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const HTTP_URL_RE = /^https?:\/\//i;

export function optionalString(
	value: unknown,
	name: string,
	max = 1024,
): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string")
		throw new McpValidationError(`${name} must be a string.`);
	const trimmed = value.trim();
	if (trimmed.length === 0) return undefined;
	if (trimmed.length > max)
		throw new McpValidationError(`${name} is too long.`);
	return trimmed;
}

const MEMORY_KINDS = new Set<MemoryKind>([
	"decision",
	"constraint",
	"goal",
	"preference",
	"reference",
	"summary",
	"note",
]);

export function validateMemoryKind(
	value: unknown,
	name = "kind",
): MemoryKind | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string" || !MEMORY_KINDS.has(value as MemoryKind)) {
		throw new McpValidationError(
			`${name} must be one of: ${[...MEMORY_KINDS].join(", ")}.`,
		);
	}
	return value as MemoryKind;
}

export function requiredString(
	value: unknown,
	name: string,
	max = 8192,
): string {
	const result = optionalString(value, name, max);
	if (result === undefined)
		throw new McpValidationError(`${name} is required.`);
	return result;
}

export function optionalBoolean(
	value: unknown,
	name: string,
): boolean | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "boolean")
		throw new McpValidationError(`${name} must be a boolean.`);
	return value;
}

export function optionalNumber(
	value: unknown,
	name: string,
	min: number,
	max: number,
): number | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "number" || !Number.isFinite(value))
		throw new McpValidationError(`${name} must be a finite number.`);
	if (value < min || value > max)
		throw new McpValidationError(`${name} must be between ${min} and ${max}.`);
	return value;
}

export function optionalInteger(
	value: unknown,
	name: string,
	min: number,
	max: number,
): number | undefined {
	const number = optionalNumber(value, name, min, max);
	if (number === undefined) return undefined;
	if (!Number.isInteger(number))
		throw new McpValidationError(`${name} must be an integer.`);
	return number;
}

export function optionalStringArray(
	value: unknown,
	name: string,
	maxItems = 50,
	maxLength = 128,
): string[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value))
		throw new McpValidationError(`${name} must be an array.`);
	if (value.length > maxItems)
		throw new McpValidationError(`${name} has too many items.`);
	const result: string[] = [];
	const seen = new Set<string>();
	for (const [index, item] of value.entries()) {
		const text = requiredString(item, `${name}[${index}]`, maxLength);
		if (!SAFE_TOKEN_RE.test(text))
			throw new McpValidationError(
				`${name}[${index}] contains unsafe characters.`,
			);
		if (!seen.has(text)) {
			seen.add(text);
			result.push(text);
		}
	}
	return result;
}

export function validateId(value: unknown, name: string): string {
	const id = requiredString(value, name, 256);
	if (!SAFE_ID_RE.test(id))
		throw new McpValidationError(`${name} contains unsafe characters.`);
	if (id.includes(".."))
		throw new McpValidationError(`${name} must not contain path traversal.`);
	return id;
}

function validatePath(path: string, name: string): void {
	if (path.startsWith("/") || path.startsWith("\\"))
		throw new McpValidationError(`${name} must be workspace-relative.`);
	if (path.includes("\\"))
		throw new McpValidationError(`${name} must use forward slashes.`);
	if (path.includes("../") || path === ".." || path.startsWith(".."))
		throw new McpValidationError(`${name} must not escape the workspace.`);
	if (/^[a-z][a-z0-9+.-]*:/i.test(path))
		throw new McpValidationError(`${name} must not be a protocol URL.`);
}

export function validateSourceRefs(
	value: unknown,
	name = "sourceRefs",
): SourceRef[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value))
		throw new McpValidationError(`${name} must be an array.`);
	if (value.length > 100)
		throw new McpValidationError(`${name} has too many items.`);
	return value.map((item, index): SourceRef => {
		if (!isPlainObject(item))
			throw new McpValidationError(`${name}[${index}] must be an object.`);
		const sourceType = requiredString(
			item.sourceType,
			`${name}[${index}].sourceType`,
			128,
		);
		if (!SAFE_TOKEN_RE.test(sourceType))
			throw new McpValidationError(`${name}[${index}].sourceType is unsafe.`);
		const sourceId = optionalString(
			item.sourceId,
			`${name}[${index}].sourceId`,
			256,
		);
		const path = optionalString(item.path, `${name}[${index}].path`, 2048);
		const title = optionalString(item.title, `${name}[${index}].title`, 512);
		const url = optionalString(item.url, `${name}[${index}].url`, 2048);
		if (path !== undefined) validatePath(path, `${name}[${index}].path`);
		if (url !== undefined && !HTTP_URL_RE.test(url))
			throw new McpValidationError(`${name}[${index}].url must be HTTP(S).`);
		const metadata =
			item.metadata === undefined
				? undefined
				: toJsonObject(item.metadata, `${name}[${index}].metadata`);
		return {
			sourceType,
			...(sourceId === undefined ? {} : { sourceId }),
			...(path === undefined ? {} : { path }),
			...(title === undefined ? {} : { title }),
			...(url === undefined ? {} : { url }),
			...(metadata === undefined ? {} : { metadata }),
		};
	});
}

export function validateGraphNode(value: unknown, index = 0): GraphNodeInput {
	if (!isPlainObject(value))
		throw new McpValidationError(`nodes[${index}] must be an object.`);
	const aliases = optionalStringArray(
		value.aliases,
		`nodes[${index}].aliases`,
		50,
		256,
	);
	const summary = optionalString(
		value.summary,
		`nodes[${index}].summary`,
		4096,
	);
	const confidence = optionalNumber(
		value.confidence,
		`nodes[${index}].confidence`,
		0,
		1,
	);
	const importance = optionalNumber(
		value.importance,
		`nodes[${index}].importance`,
		0,
		1,
	);
	const status = optionalString(value.status, `nodes[${index}].status`, 64);
	const sourceRefs = validateSourceRefs(
		value.sourceRefs,
		`nodes[${index}].sourceRefs`,
	);
	const metadata =
		value.metadata === undefined
			? undefined
			: toJsonObject(value.metadata, `nodes[${index}].metadata`);
	return {
		id: validateId(value.id, `nodes[${index}].id`),
		type: requiredString(value.type, `nodes[${index}].type`, 128),
		label: requiredString(value.label, `nodes[${index}].label`, 512),
		...(aliases === undefined ? {} : { aliases }),
		...(summary === undefined ? {} : { summary }),
		...(confidence === undefined ? {} : { confidence }),
		...(importance === undefined ? {} : { importance }),
		...(status === undefined ? {} : { status }),
		...(sourceRefs === undefined ? {} : { sourceRefs }),
		...(metadata === undefined ? {} : { metadata }),
	};
}

export function validateGraphEdge(value: unknown, index = 0): GraphEdgeInput {
	if (!isPlainObject(value))
		throw new McpValidationError(`edges[${index}] must be an object.`);
	const id = optionalString(value.id, `edges[${index}].id`, 256);
	const directed = optionalBoolean(value.directed, `edges[${index}].directed`);
	const dedupeKey = optionalString(
		value.dedupeKey,
		`edges[${index}].dedupeKey`,
		256,
	);
	const weight = optionalNumber(value.weight, `edges[${index}].weight`, 0, 1);
	const confidence = optionalNumber(
		value.confidence,
		`edges[${index}].confidence`,
		0,
		1,
	);
	const status = optionalString(value.status, `edges[${index}].status`, 64);
	const sourceRefs = validateSourceRefs(
		value.sourceRefs,
		`edges[${index}].sourceRefs`,
	);
	const metadata =
		value.metadata === undefined
			? undefined
			: toJsonObject(value.metadata, `edges[${index}].metadata`);
	return {
		...(id === undefined ? {} : { id }),
		from: validateId(value.from, `edges[${index}].from`),
		to: validateId(value.to, `edges[${index}].to`),
		type: requiredString(value.type, `edges[${index}].type`, 128),
		...(directed === undefined ? {} : { directed }),
		...(dedupeKey === undefined ? {} : { dedupeKey }),
		...(weight === undefined ? {} : { weight }),
		...(confidence === undefined ? {} : { confidence }),
		...(status === undefined ? {} : { status }),
		...(sourceRefs === undefined ? {} : { sourceRefs }),
		...(metadata === undefined ? {} : { metadata }),
	};
}

export function ensurePayloadSize(
	value: unknown,
	maxBytes: number,
	name = "input",
): void {
	assertJsonValue(value, name);
	const bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
	if (bytes > maxBytes)
		throw new McpValidationError(`${name} exceeds ${maxBytes} bytes.`, {
			bytes,
			maxBytes,
		});
}
