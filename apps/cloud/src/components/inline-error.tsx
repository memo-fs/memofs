import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * Inline error UI for use inside child route layouts.
 *
 * Renders a compact alert card that can be dropped into any
 * page area (dashboard panels, forms, lists) without taking
 * over the whole screen.
 *
 * @example
 * ```tsx
 * export function ErrorBoundary() {
 *   return <InlineError />;
 * }
 * ```
 */
export interface InlineErrorProps {
	/** Override the default message. */
	message?: string;
	/** Show a reload action. */
	showReload?: boolean;
	/** Dismiss callback. */
	onDismiss?: () => void;
	className?: string;
}

export function InlineError({
	message = "Something went wrong loading this section.",
	showReload = true,
	onDismiss,
	className,
}: InlineErrorProps) {
	return (
		<div
			className={cn(
				"flex w-full flex-col gap-4 border border-destructive/30 bg-destructive/5 p-5 text-left",
				className,
			)}
		>
			<div className="flex items-start gap-3">
				<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<h3 className="font-heading text-sm font-bold tracking-tight text-foreground">
						Error
					</h3>
					<p className="text-xs leading-relaxed text-muted-foreground">
						{message}
					</p>
				</div>
				{onDismiss && (
					<button
						type="button"
						onClick={onDismiss}
						aria-label="Dismiss error"
						className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>

			{showReload && (
				<div className="flex items-center gap-2 pl-8">
					<Button
						variant="default"
						size="sm"
						onClick={() => window.location.reload()}
						className="h-7 gap-1.5 px-2.5 text-xs"
					>
						<RotateCcw className="size-3.5" />
						Reload
					</Button>
				</div>
			)}
		</div>
	);
}
