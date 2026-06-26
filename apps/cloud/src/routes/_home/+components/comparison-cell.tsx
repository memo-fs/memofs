import { Check, Minus, X } from "lucide-react";
import { cn } from "~/lib/utils";
import type { Cell } from "../+utils/landing-content";

/**
 * Renders one comparison-table cell as a lucide icon (no emoji): a check for
 * "yes", a minus for "partial", and an x for "no". `highlight` tints the TekMemo
 * column with the primary accent; the other columns stay muted.
 */
export function StatusCell({
	cell,
	highlight = false,
}: {
	cell: Cell;
	highlight?: boolean;
}) {
	if (cell.status === "yes") {
		return <StatusIcon Icon={Check} note={cell.note} highlight={highlight} />;
	}
	if (cell.status === "partial") {
		return <StatusIcon Icon={Minus} note={cell.note} dim />;
	}
	return <StatusIcon Icon={X} dim strongDim />;
}

function StatusIcon({
	Icon,
	note,
	highlight = false,
	dim = false,
	strongDim = false,
}: {
	Icon: typeof Check;
	note?: string;
	highlight?: boolean;
	dim?: boolean;
	strongDim?: boolean;
}) {
	return (
		<div className="flex flex-col items-center gap-1">
			<Icon
				className={cn(
					"size-4",
					highlight && "text-primary",
					!highlight && dim && "text-muted-foreground/60",
					strongDim && "text-muted-foreground/30",
					!highlight && !dim && !strongDim && "text-muted-foreground",
				)}
			/>
			{note ? (
				<span className="font-mono text-[0.7rem] text-muted-foreground">
					{note}
				</span>
			) : null}
		</div>
	);
}
