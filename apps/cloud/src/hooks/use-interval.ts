import React from "react"

/**
 * A hook that creates an interval that can be paused and resumed
 *
 * @param callback - The function to call on each interval tick
 * @param delay - The interval delay in milliseconds. Set to null to pause the interval
 *
 * @example
 * ```tsx
 * function Timer() {
 *   const [count, setCount] = React.useState(0);
 *
 *   useInterval(() => {
 *     setCount(c => c + 1);
 *   }, 1000);
 *
 *   return <div>Count: {count}</div>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * function PausableTimer() {
 *   const [count, setCount] = React.useState(0);
 *   const [isPaused, setIsPaused] = React.useState(false);
 *
 *   useInterval(() => {
 *     setCount(c => c + 1);
 *   }, isPaused ? null : 1000);
 *
 *   return (
 *     <div>
 *       <div>Count: {count}</div>
 *       <button onClick={() => setIsPaused(p => !p)}>
 *         {isPaused ? 'Resume' : 'Pause'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useInterval(callback: () => void, delay: number | null) {
	const intervalRef = React.useRef<number | null>(null)
	const savedCallback = React.useRef(callback)

	// Update callback ref when callback changes
	React.useEffect(() => {
		savedCallback.current = callback
	}, [callback])

	// Set up the interval
	React.useEffect(() => {
		const tick = () => savedCallback.current()

		if (typeof delay === "number") {
			intervalRef.current = window.setInterval(tick, delay)

			return () => window.clearInterval(intervalRef?.current ?? undefined)
		}
	}, [delay])

	return intervalRef
}
