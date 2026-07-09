/**
 * Shared prototype-pollution key blocklist.
 *
 * @remarks
 * Single source of truth for the set of object keys that must be rejected to
 * prevent prototype pollution (`__proto__`, `prototype`, `constructor`).
 * Every metadata/filter validator in the package imports this constant
 * instead of re-declaring it.
 *
 * @internal
 */

/**
 * Object keys that are forbidden because they enable prototype pollution.
 *
 * @internal
 */
export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
	"__proto__",
	"prototype",
	"constructor",
]);

/**
 * Returns `true` if the given key is a prototype-pollution vector.
 *
 * @param key - The object key to test.
 *
 * @internal
 */
export function isForbiddenKey(key: string): boolean {
	return FORBIDDEN_KEYS.has(key);
}
