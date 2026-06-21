import { useEffect, useMemo, useRef } from "react"

/**
 * Creates a debounced version of a function.
 * Prevents function from being called too frequently by delaying execution
 * and cancelling previous calls if a new call is made within the delay period.
 *
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds before executing the function
 * @returns Debounced function that delays execution
 *
 * @example
 * ```ts
 * const debouncedSearch = debounce((query) => {
 *   searchAPI(query);
 * }, 300);
 *
 * // Multiple rapid calls will only execute the last one after 300ms
 * debouncedSearch("a");
 * debouncedSearch("ab");
 * debouncedSearch("abc"); // Only this call will execute
 * ```
 */
export function debounce<
	Callback extends (...args: Parameters<Callback>) => void,
>(fn: Callback, delay: number) {
	let timer: ReturnType<typeof setTimeout> | null = null
	return (...args: Parameters<Callback>) => {
		if (timer) clearTimeout(timer)
		timer = setTimeout(() => {
			fn(...args)
		}, delay)
	}
}

/**
 * Creates a debounced function that persists across renders.
 * Uses useRef to maintain the debounced function instance.
 *
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function that persists across renders
 *
 * @example
 * ```ts
 * const debouncedSearch = useDebounce((query) => {
 *   searchAPI(query);
 * }, 300);
 * ```
 */
export function useDebounce<
	Callback extends (...args: Parameters<Callback>) => ReturnType<Callback>,
>(callback: Callback, delay: number) {
	const callbackRef = useRef(callback)
	useEffect(() => {
		callbackRef.current = callback
	})
	return useMemo(
		() =>
			debounce(
				(...args: Parameters<Callback>) => callbackRef.current(...args),
				delay,
			),
		[delay],
	)
}
