import * as React from "react";

/**
 * Observe when an element scrolls into the viewport. With `once` (default) the
 * observer disconnects after the first intersection so the flag latches `true`
 * — handy for play-once entrance animations that shouldn't replay on scroll.
 */
export function useInView<T extends Element = HTMLDivElement>({
	once = true,
	rootMargin = "0px",
	threshold = 0.3,
}: {
	once?: boolean;
	rootMargin?: string;
	threshold?: number;
} = {}) {
	const ref = React.useRef<T>(null);
	const [inView, setInView] = React.useState(false);

	React.useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setInView(true);
					if (once) observer.disconnect();
				} else if (!once) {
					setInView(false);
				}
			},
			{ rootMargin, threshold },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [once, rootMargin, threshold]);

	return [ref, inView] as const;
}
