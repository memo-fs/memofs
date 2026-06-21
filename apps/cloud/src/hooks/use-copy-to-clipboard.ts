import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Options for the useCopyToClipboard hook
 */
interface UseCopyToClipboardOptions {
	/** Duration in milliseconds to show "copied" state (default: 2000) */
	resetDelay?: number
	/** Callback when copy succeeds */
	onSuccess?: () => void
	/** Callback when copy fails */
	onError?: (error: Error) => void
}

/**
 * Return type for the useCopyToClipboard hook
 */
interface UseCopyToClipboardReturn {
	/** Whether content was recently copied */
	copied: boolean
	/** Function to copy text to clipboard */
	copy: (text: string) => Promise<void>
	/** Reset the copied state manually */
	reset: () => void
}

/**
 * Hook for copying text to the clipboard with auto-reset state.
 *
 * @param options - Configuration options
 * @returns Object with `copied` state, `copy` function, and `reset` function
 *
 * @example
 * ```tsx
 * function CopyButton({ code }: { code: string }) {
 *   const { copied, copy } = useCopyToClipboard()
 *
 *   return (
 *     <button onClick={() => copy(code)}>
 *       {copied ? "Copied!" : "Copy"}
 *     </button>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With toast notification on success
 * const { copied, copy } = useCopyToClipboard({
 *   onSuccess: () => toast.success("Copied to clipboard"),
 *   onError: () => toast.error("Failed to copy"),
 *   resetDelay: 3000,
 * })
 * ```
 */
export function useCopyToClipboard(
	options: UseCopyToClipboardOptions = {},
): UseCopyToClipboardReturn {
	const { resetDelay = 2000, onSuccess, onError } = options
	const [copied, setCopied] = useState(false)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	const reset = useCallback(() => {
		setCopied(false)
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
	}, [])

	const copy = useCallback(
		async (text: string): Promise<void> => {
			// Clear any existing timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}

			try {
				await navigator.clipboard.writeText(text)
				setCopied(true)
				onSuccess?.()

				// Auto-reset after delay
				timeoutRef.current = setTimeout(() => {
					setCopied(false)
					timeoutRef.current = null
				}, resetDelay)
			} catch (error) {
				onError?.(error instanceof Error ? error : new Error("Copy failed"))
			}
		},
		[resetDelay, onSuccess, onError],
	)

	return { copied, copy, reset }
}
