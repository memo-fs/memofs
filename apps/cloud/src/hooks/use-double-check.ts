import { useState } from "react";

/**
 * Calls all provided functions with the same arguments.
 * Useful for combining multiple event handlers or callbacks.
 * Safely handles undefined functions by filtering them out.
 *
 * @param fns - Array of functions to call (undefined functions are ignored)
 * @returns Function that calls all provided functions with the same arguments
 *
 * @example
 * ```ts
 * const combinedHandler = callAll(
 *   onBlur,
 *   props.onBlur,
 *   () => console.log('blurred')
 * );
 *
 * // Usage: combinedHandler(event) will call all three functions with event
 * ```
 */
function callAll<Args extends Array<unknown>>(
	...fns: Array<((...args: Args) => unknown) | undefined>
) {
	// biome-ignore lint/suspicious/useIterableCallbackReturn: allow the return value
	return (...args: Args) => fns.forEach((fn) => fn?.(...args));
}

/**
 * Hook for implementing double-click confirmation on buttons.
 * First click sets doubleCheck state, second click triggers action.
 *
 * @returns Object containing doubleCheck state and button props
 * @returns {boolean} doubleCheck - Whether button is in confirmation state
 * @returns {function} getButtonProps - Function to get button props
 *
 * @example
 * ```ts
 * const { doubleCheck, getButtonProps } = useDoubleCheck();
 * return (
 *   <button {...getButtonProps({ onClick: handleDelete })}>
 *     {doubleCheck ? "Are you sure?" : "Delete"}
 *   </button>
 * );
 * ```
 */
export function useDoubleCheck() {
	const [doubleCheck, setDoubleCheck] = useState(false);

	function getButtonProps(
		props?: React.ButtonHTMLAttributes<HTMLButtonElement>,
	) {
		const onBlur: React.ButtonHTMLAttributes<HTMLButtonElement>["onBlur"] =
			() => setDoubleCheck(false);

		const onClick: React.ButtonHTMLAttributes<HTMLButtonElement>["onClick"] =
			doubleCheck
				? undefined
				: (e) => {
						e.preventDefault();
						setDoubleCheck(true);
					};

		const onKeyUp: React.ButtonHTMLAttributes<HTMLButtonElement>["onKeyUp"] = (
			e,
		) => {
			if (e.key === "Escape") {
				setDoubleCheck(false);
			}
		};

		return {
			...props,
			onBlur: callAll(onBlur, props?.onBlur),
			onClick: callAll(onClick, props?.onClick),
			onKeyUp: callAll(onKeyUp, props?.onKeyUp),
		};
	}

	return { doubleCheck, getButtonProps };
}
