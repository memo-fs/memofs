import type { ReactNode } from "react";

/**
 * Dashboard page header — title + subtitle, consistent across all dashboard
 * pages (SC3). Optional `action` slot for the page-level button (e.g. "New
 * project").
 */
export function PageHeader({
	title,
	subtitle,
	action,
}: {
	title: string;
	subtitle?: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div className="mb-6 flex items-center justify-between">
			<div>
				<h2 className="mb-0.5 text-xl font-bold tracking-tight">{title}</h2>
				{subtitle && (
					<p className="text-xs text-muted-foreground">{subtitle}</p>
				)}
			</div>
			{action}
		</div>
	);
}
