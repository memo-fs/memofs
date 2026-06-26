import * as React from "react";

/**
 * Tracks the user's `prefers-reduced-motion` setting so motion-heavy UI can
 * fall back to a static presentation. Returns `false` during SSR / first paint,
 * then syncs once mounted and on subsequent changes.
 */
export function usePrefersReducedMotion() {
	const [reduced, setReduced] = React.useState(false);

	React.useEffect(() => {
		const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
		const onChange = () => setReduced(mql.matches);
		onChange();
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	return reduced;
}
