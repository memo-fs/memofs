/**
 * Internal shared primitives for `@memofs/core`.
 *
 * @remarks
 * Single-source-of-truth helpers (clone, deep-equal, lexical scoring,
 * forbidden-keys, not-found classification) consumed across zones. These are
 * deliberately NOT re-exported through the public root barrel — they are
 * `@internal` implementation detail. Zones import directly from this module.
 *
 * @internal
 */

export { cloneJson } from "./clone";
export {
	getByPath,
	stableDeepEqual,
} from "./deep-equal";
export {
	FORBIDDEN_KEYS,
	isForbiddenKey,
} from "./forbidden-keys";
export { isNotFoundError } from "./is-not-found-error";
export {
	tokenizeSimple,
	tokenOverlapScore,
} from "./lexical";
export {
	KNOWN_SECRET_PREFIX_PATTERNS,
	type SecretPrefixPattern,
} from "./secret-prefixes";
