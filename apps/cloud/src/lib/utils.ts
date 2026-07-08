/**
 * Shared UI utilities.
 *
 * `cn()` merges Tailwind CSS class lists using `clsx` + `twMerge` — the
 * single entry point for conditional/merged classnames across the app.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges multiple class-value inputs into a single Tailwind-safe string.
 *
 * Resolves conflicting Tailwind utilities (e.g. `px-4 px-2` → `px-2`) and
 * conditionally includes classes via falsy values.
 *
 * @param inputs - Class values (strings, arrays, objects, falsy) to merge.
 * @returns A deduplicated Tailwind class string.
 *
 * @example
 * ```tsx
 * cn("px-4 py-2", isActive && "bg-primary", "px-2")
 * // → "py-2 px-2 bg-primary"
 * ```
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
