import { useFormAction, useNavigation } from "react-router";

import { useSpinDelay } from "spin-delay";

/**
 * Determines if a form is currently being submitted.
 * Uses React Router's navigation state to check form submission status.
 *
 * @param options - Configuration options
 * @param options.formAction - Specific form action to check (defaults to current route)
 * @param options.formMethod - HTTP method to check (defaults to 'POST')
 * @param options.state - Navigation state to check (defaults to 'non-idle')
 * @returns boolean indicating if form is being submitted
 *
 * @example
 * ```ts
 * const isSubmitting = useIsPending({
 *   formMethod: 'POST',
 *   state: 'submitting'
 * });
 * ```
 */
export function useIsPending({
	formAction,
	formMethod = "POST",
	state = "non-idle",
}: {
	formAction?: string;
	formMethod?: "POST" | "GET" | "PUT" | "PATCH" | "DELETE";
	state?: "submitting" | "loading" | "non-idle";
} = {}) {
	const contextualFormAction = useFormAction();
	const navigation = useNavigation();
	const isPendingState =
		state === "non-idle"
			? navigation.state !== "idle"
			: navigation.state === state;
	return (
		isPendingState &&
		navigation.formAction === (formAction ?? contextualFormAction) &&
		navigation.formMethod === formMethod
	);
}

/**
 * Combines useSpinDelay with useIsPending to prevent loading state flicker.
 * Ensures loading spinner shows for minimum duration even if request completes quickly.
 *
 * @param options - Configuration options
 * @param options.delay - Delay before showing spinner (default: 400ms)
 * @param options.minDuration - Minimum spinner display time (default: 300ms)
 * @returns boolean indicating if loading state should be shown
 *
 * @example
 * ```ts
 * const showSpinner = useDelayedIsPending({
 *   delay: 500,
 *   minDuration: 400
 * });
 * ```
 */
export function useDelayedIsPending({
	formAction,
	formMethod,
	delay = 400,
	minDuration = 300,
}: Parameters<typeof useIsPending>[0] &
	Parameters<typeof useSpinDelay>[1] = {}) {
	const isPending = useIsPending({ formAction, formMethod });
	const delayedIsPending = useSpinDelay(isPending, {
		delay,
		minDuration,
	});
	return delayedIsPending;
}
