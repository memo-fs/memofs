import { AlertTriangle, Bug, Home, RotateCcw } from "lucide-react";
import { type ErrorResponse, isRouteErrorResponse } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * Full-page error UI used by the root `ErrorBoundary`.
 *
 * Shows a branded, dark-themed screen with status code, message,
 * and recovery actions. Works for both route-error responses and
 * unexpected runtime errors.
 */
export interface RootErrorUIProps {
	error: ErrorResponse | Error;
	className?: string;
}

export function RootErrorUI({ error, className }: RootErrorUIProps) {
	let status = 500;
	let title = "Something went wrong";
	let message = "An unexpected error occurred. Please try again later.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		status = error.status;
		title = `${error.status} ${error.statusText}`;
		message =
			typeof error.data === "string"
				? error.data
				: "An error occurred while processing your request.";
	} else if (error instanceof Error) {
		message = error.message;
		stack = error.stack;
	}

	return (
		<div
			className={cn(
				"flex min-h-screen flex-col items-center justify-center bg-background px-4",
				className,
			)}
		>
			<div className="flex max-w-md flex-col items-center gap-8 text-center">
				{/* Icon + Status */}
				<div className="relative flex h-24 w-24 items-center justify-center border border-destructive/30 bg-destructive/5 text-destructive">
					<AlertTriangle className="h-10 w-10" />
					<div className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center bg-background text-xs font-mono font-bold text-destructive">
						{status}
					</div>
				</div>

				{/* Text */}
				<div className="flex flex-col gap-2">
					<h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
						{title}
					</h1>
					<p className="text-sm text-muted-foreground">{message}</p>
				</div>

				{/* Actions */}
				<div className="flex flex-wrap items-center justify-center gap-3">
					<Button
						variant="default"
						size="default"
						onClick={() => window.location.reload()}
					>
						<RotateCcw className="size-4" />
						Reload page
					</Button>
					<Button variant="outline" size="default" asChild>
						<a href="/">
							<Home className="size-4" />
							Go home
						</a>
					</Button>
				</div>

				{/* Stack (dev-only / helpful detail) */}
				{stack && (
					<details className="w-full text-left">
						<summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
							<div className="flex items-center gap-1">
								<Bug className="size-3" />
								View stack trace
							</div>
						</summary>
						<pre className="mt-2 max-h-64 overflow-auto rounded-sm bg-muted p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
							{stack}
						</pre>
					</details>
				)}
			</div>
		</div>
	);
}
