import { cn } from "../lib/utils";

/**
 * Drafting-crosshair marker used at the corners of the landing-style hero
 * frames. Shared (previously copy-pasted across five routes) so the
 * geometry stays identical everywhere.
 */
export function Crosshair({ className }: { className?: string }) {
	return (
		<svg
			className={cn(
				"pointer-events-none absolute h-3.5 w-3.5 text-muted-foreground/70 animate-crosshair",
				className,
			)}
			viewBox="0 0 14 14"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.2"
			aria-hidden="true"
		>
			<line x1="7" y1="0" x2="7" y2="14" />
			<line x1="0" y1="7" x2="14" y2="7" />
		</svg>
	);
}
