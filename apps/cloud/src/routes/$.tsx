import { ArrowLeft, FileQuestion, Home } from "lucide-react";
import { Link } from "react-router";
import { LogoMark, Wordmark } from "~/components/site/logo";
import { Button } from "~/components/ui/button";

/**
 * Catch-all route for unmatched paths.
 *
 * Presents a branded 404 screen that keeps the user in-context.
 * The layout picks up the dark theme automatically (root html has `className="dark"`).
 */
export default function NotFoundRoute() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
			<div className="flex max-w-md flex-col items-center gap-8 text-center">
				{/* Brand */}
				<div className="flex items-center gap-2.5">
					<LogoMark size={30} />
					<Wordmark />
				</div>

				{/* 404 Graphic */}
				<div className="relative flex h-24 w-24 items-center justify-center border border-border bg-card text-muted-foreground">
					<FileQuestion className="h-10 w-10" />
					<div className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center bg-background text-xs font-mono font-bold text-foreground">
						404
					</div>
				</div>

				{/* Message */}
				<div className="flex flex-col gap-2">
					<h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
						Page not found
					</h1>
					<p className="text-sm text-muted-foreground">
						The page you are looking for does not exist or has been moved.
					</p>
				</div>

				{/* Actions */}
				<div className="flex flex-wrap items-center justify-center gap-3">
					<Button asChild variant="default" size="default">
						<Link to="/">
							<Home className="size-4" />
							Go home
						</Link>
					</Button>
					<Button asChild variant="outline" size="default">
						<Link to="-1">
							<ArrowLeft className="size-4" />
							Back
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
