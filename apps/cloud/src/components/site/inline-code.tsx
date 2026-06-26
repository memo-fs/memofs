import type * as React from "react";
import { cn } from "~/lib/utils";

/**
 * InlineCode — the standard inline `<code>` chip used across the public pages:
 * a muted rounded background over a monospace token (e.g. `.tekmemo/`).
 *
 * One shared component so the treatment never drifts between sections. Pass a
 * smaller `size="sm"` variant inside dense copy where the default looks heavy.
 */
export function InlineCode({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<code
			className={cn(
				"rounded bg-muted px-1.5 py-0.5 font-mono text-foreground",
				className,
			)}
		>
			{children}
		</code>
	);
}
