/**
 * `@anchor` marker parser + TypeScript Compiler API symbol extraction.
 *
 * Two exported seams:
 *
 * - {@link parseAnchorMarker} — a pure regex parser that extracts the
 *   first `@anchor(file=…, symbol=…)` (or `@anchor(file=…)`) marker from
 *   memory `content`. Returns `{ file, symbol? }` or `undefined`. The
 *   marker is treated as **data**, not directives — the content text is
 *   not modified, and the extracted strings are used only as metadata
 *   (file path + symbol name), never interpreted as instructions.
 * - {@link extractSymbolPath} — uses the TypeScript Compiler API
 *   (lazy-loaded via dynamic `import("typescript")`) to validate that a
 *   dotted symbol path exists in a `.ts`/`.tsx` file. Returns the full
 *   `<file>#<dotted-path>` string when valid, `undefined` when the symbol
 *   is not found, the file is non-TS, or the `typescript` module is not
 *   available.
 *
 * The write path calls {@link resolveWriteAnchor} which combines both
 * seams with hash computation (delegated to `recomputeFileHash`).
 *
 * ## Security: data, not directives
 *
 * `@anchor` markers are parsed for metadata extraction only. The regex
 * is bounded — it captures `file=…` and `symbol=…` values as plain
 * strings. The marker cannot inject into the model's reasoning because
 * it is never interpreted as a prompt directive; it is a data annotation
 * in the agent's prose whose sole effect is populating the typed
 * `AnchorRef` metadata on the memory record.
 *
 * @internal
 */

import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { AnchorRef } from "../types";
import {
	isSafeAnchorPath,
	recomputeFileHash,
	resolveAnchorFilePath,
} from "./anchor-drift";

/**
 * Result of parsing an `@anchor` marker from content.
 *
 * @internal
 */
export interface ParsedAnchorMarker {
	file: string;
	symbol?: string;
}

/**
 * Regex for `@anchor(file=…, symbol=…)` or `@anchor(file=…)`.
 *
 * - `file` value: one or more non-comma, non-space, non-`)` characters
 *   (file paths contain `/`, `.`, `-`, `_`, alphanumerics).
 * - `symbol` value: one or more non-space, non-`)` characters (dotted
 *   paths contain `.`, alphanumerics, `_`).
 * - Whitespace around `file=` / `symbol=` and after the comma is
 *   tolerated.
 *
 * @internal
 */
const ANCHOR_MARKER_RE =
	/@anchor\(\s*file=([^,\s)]+)(?:\s*,\s*symbol=([^)\s]+))?\s*\)/;

/**
 * Parses the first `@anchor(file=…, symbol=…)` marker from `content`.
 * Returns `undefined` when no marker is present.
 *
 * The marker is treated as **data** — the content text is not modified.
 * The extracted `file` and `symbol` strings are used only as metadata
 * for populating `AnchorRef`.
 *
 * @internal
 */
export function parseAnchorMarker(
	content: string,
): ParsedAnchorMarker | undefined {
	const match = ANCHOR_MARKER_RE.exec(content);
	if (!match || match[1] === undefined) return undefined;
	const file = match[1];
	const symbol = match[2];
	return {
		file,
		...(symbol === undefined ? {} : { symbol }),
	};
}

/**
 * File extensions the TypeScript Compiler API can parse for symbol
 * validation.
 *
 * @internal
 */
const TS_EXTENSIONS = new Set([".ts", ".tsx"]);

/**
 * Returns `true` when `filePath` has a `.ts` or `.tsx` extension.
 *
 * @internal
 */
export function isTsFilePath(filePath: string): boolean {
	return TS_EXTENSIONS.has(extname(filePath).toLowerCase());
}

// `isSafeAnchorPath` is re-exported from `anchor-drift.ts` — the SSOT for
// path resolution and safety checks. See `anchor-drift.ts` for the
// implementation and the symlink-limitation note.
export { isSafeAnchorPath } from "./anchor-drift";

/**
 * Splits a serialized symbol path (`<file>#<dotted-symbol-path>`) back
 * into its `file` and `symbol` components. Returns `undefined` when the
 * string does not contain a `#` separator or either part is empty.
 *
 * This is the parse-back counterpart to `extractSymbolPath` — the
 * serialized form is plain-string serializable into `AnchorRef.symbol`
 * and this function reverses the serialization for migration / re-anchor
 * lookups.
 *
 * @internal
 */
export function parseSymbolPath(
	symbolPath: string,
): { file: string; symbol: string } | undefined {
	const hashIdx = symbolPath.indexOf("#");
	if (hashIdx <= 0 || hashIdx === symbolPath.length - 1) return undefined;
	const file = symbolPath.slice(0, hashIdx);
	const symbol = symbolPath.slice(hashIdx + 1);
	if (file.length === 0 || symbol.length === 0) return undefined;
	return { file, symbol };
}

let cachedTsPromise: Promise<typeof import("typescript")> | undefined;

async function loadTsModule(): Promise<
	typeof import("typescript") | undefined
> {
	if (!cachedTsPromise) {
		cachedTsPromise = import("typescript");
	}
	try {
		return await cachedTsPromise;
	} catch {
		return undefined;
	}
}

/**
 * Uses the TypeScript Compiler API (lazy-loaded) to validate that the
 * given dotted symbol path exists in the file. Returns the full symbol
 * path (`<file>#<dotted-path>`) when the symbol is found, `undefined`
 * when:
 *
 * - the file is not `.ts`/`.tsx` (non-TS files leave `symbol` undefined
 *   at v1),
 * - the `typescript` module is not available (lazy-load fails — the
 *   anchor still works with `file + hash`; only the optional `symbol`
 *   field is lost),
 * - the file cannot be read,
 * - the symbol does not exist in the file.
 *
 * @internal
 */
export async function extractSymbolPath(args: {
	/** Repo-relative file path (e.g. `src/auth/provider.ts`). */
	file: string;
	/** Dotted symbol name (e.g. `verifyJwt` or `AuthProvider.verifyJwt`). */
	symbol: string;
	/** Absolute project root dir for resolving the file path. */
	rootDir: string;
}): Promise<string | undefined> {
	if (!isTsFilePath(args.file)) return undefined;

	const ts = await loadTsModule();
	if (!ts) return undefined;

	const absolutePath = resolveAnchorFilePath(args.file, args.rootDir);
	let sourceText: string;
	try {
		sourceText = await readFile(absolutePath, "utf8");
	} catch {
		return undefined;
	}

	const sourceFile = ts.createSourceFile(
		args.file,
		sourceText,
		ts.ScriptTarget.Latest,
		/* setParentNodes */ false,
	);

	const parts = args.symbol.split(".");
	if (symbolExistsInSourceFile(ts, sourceFile, parts)) {
		return `${args.file}#${args.symbol}`;
	}
	return undefined;
}

/**
 * Walks the AST of a `SourceFile` to check whether a dotted symbol path
 * exists as a chain of named declarations (e.g. `AuthProvider` →
 * `verifyJwt`).
 *
 * Handles the common declaration node types: functions, classes,
 * interfaces, type aliases, enums, namespaces (`module` declarations),
 * variable statements (`const`/`let`), and class/interface members
 * (methods, properties, method signatures, property signatures).
 *
 * @internal
 */
function symbolExistsInSourceFile(
	ts: typeof import("typescript"),
	sourceFile: import("typescript").SourceFile,
	parts: string[],
): boolean {
	let scope: import("typescript").Node = sourceFile;
	for (const part of parts) {
		const found = findChildDeclarationByName(ts, scope, part);
		if (found === undefined) return false;
		// Namespace (ModuleDeclaration) members live inside a ModuleBlock
		// body — descend into it so the next part searches the namespace's
		// actual members, not the ModuleBlock wrapper.
		scope =
			ts.isModuleDeclaration(found) && found.body !== undefined
				? found.body
				: found;
	}
	return true;
}

/**
 * Finds the first child of `parent` whose declaration name matches
 * `name`. Returns `undefined` when no match is found.
 *
 * @internal
 */
function findChildDeclarationByName(
	ts: typeof import("typescript"),
	parent: import("typescript").Node,
	name: string,
): import("typescript").Node | undefined {
	let result: import("typescript").Node | undefined;
	ts.forEachChild(parent, (child) => {
		if (result !== undefined) return;
		if (declarationNameMatches(ts, child, name)) {
			result = child;
		}
	});
	return result;
}

/**
 * Returns `true` when `node` is a named declaration whose name matches
 * `name`. Covers function, class, interface, type alias, enum,
 * namespace, variable, method, property, method signature, and property
 * signature declarations.
 *
 * @internal
 */
function declarationNameMatches(
	ts: typeof import("typescript"),
	node: import("typescript").Node,
	name: string,
): boolean {
	// Most named declarations have a `name` property that is an
	// Identifier (or StringLiteral/NumericLiteral). Check it first.
	const namedDecl = node as { name?: import("typescript").Node };
	if (namedDecl.name !== undefined) {
		if (ts.isIdentifier(namedDecl.name) && namedDecl.name.text === name) {
			return true;
		}
		if (ts.isStringLiteral(namedDecl.name) && namedDecl.name.text === name) {
			return true;
		}
	}

	// VariableStatement: the name lives on the first VariableDeclaration.
	if (ts.isVariableStatement(node)) {
		return node.declarationList.declarations.some(
			(d) => ts.isIdentifier(d.name) && d.name.text === name,
		);
	}

	return false;
}

/**
 * The main entry point for the write path. Resolves the final
 * `AnchorRef` for a `writeMemory` call by:
 *
 * 1. **Explicit anchor** — when `explicitAnchor` is provided on
 *    `WriteMemoryInput`, it is used as-is, with one contract
 *    adjustment: `symbol` is stripped (set to `undefined`) for non-TS
 *    files (the v1 contract is TS-only symbol extraction).
 * 2. **`@anchor` marker** — when no explicit anchor is provided but the
 *    content contains an `@anchor(file=…, symbol=…)` marker, the marker
 *    is parsed, the file's SHA-256 hash is computed, and (for `.ts`/
 *    `.tsx` files) the symbol is validated via the TypeScript Compiler
 *    API.
 * 3. **No anchor** — when neither is present, `undefined` is returned
 *    (today's default behavior — no drift detection).
 *
 * Returns `undefined` when the marker's file does not exist (cannot
 * compute a hash — the `AnchorRef.hash` field is required), or when the
 * marker's file path escapes the project root via `..` traversal
 * (security — rejected before any file read).
 *
 * Non-`ENOENT` I/O errors (permission denied, I/O fault) from the
 * underlying `readFile` propagate to the caller.
 *
 * @internal
 */
export async function resolveWriteAnchor(args: {
	/** The memory content text (searched for `@anchor` markers). */
	content: string;
	/** Explicit anchor from `WriteMemoryInput.anchor` (takes precedence). */
	explicitAnchor?: AnchorRef;
	/** Absolute project root dir for resolving file paths + computing hash. */
	rootDir: string;
}): Promise<AnchorRef | undefined> {
	// 1. Explicit anchor — validate path safety, strip symbol for non-TS.
	if (args.explicitAnchor !== undefined) {
		if (!isSafeAnchorPath(args.explicitAnchor.file, args.rootDir)) {
			return undefined;
		}
		if (isTsFilePath(args.explicitAnchor.file)) {
			return args.explicitAnchor;
		}
		// Non-TS: strip symbol per the v1 contract.
		const { symbol: _, ...rest } = args.explicitAnchor;
		return rest;
	}

	// 2. Parse @anchor marker from content.
	const marker = parseAnchorMarker(args.content);
	if (marker === undefined) return undefined;

	// Security: reject paths that escape the project root.
	if (!isSafeAnchorPath(marker.file, args.rootDir)) return undefined;

	// Compute hash from the file's bytes at write time.
	const absolutePath = resolveAnchorFilePath(marker.file, args.rootDir);
	const hash = await recomputeFileHash(absolutePath);
	if (hash === undefined) return undefined; // file not found — skip anchor.

	// Extract symbol for TS files; non-TS files get symbol = undefined.
	let symbol: string | undefined;
	if (marker.symbol !== undefined) {
		symbol = await extractSymbolPath({
			file: marker.file,
			symbol: marker.symbol,
			rootDir: args.rootDir,
		});
	}

	return {
		file: marker.file,
		hash,
		...(symbol === undefined ? {} : { symbol }),
	};
}
