/**
 * Per-connector card (SC3.3).
 *
 * Shows type, enabled toggle, schedule, source mapping, last-run status,
 * secret status (✓ stored — token never displayed), and Edit / Remove actions.
 */

import { CheckCircle2, Loader } from "lucide-react";
import { useFetcher } from "react-router";
import type { ConnectorView } from "~/.server/queries/connectors";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { formatDate } from "~/utils/misc";

export function ConnectorCard({
	connector,
	onRemove,
}: {
	connector: ConnectorView;
	onRemove: (id: string) => void;
}) {
	const toggleFetcher = useFetcher<{ ok: boolean }>();
	const isToggling = toggleFetcher.state === "submitting";

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<p className="text-xs font-semibold text-foreground capitalize">
								{connector.type}
							</p>
							<Badge variant="outline" className="px-1 py-0 text-[9px]">
								{connector.name}
							</Badge>
						</div>
						<p className="mt-1 text-[10px] text-muted-foreground">
							{connector.schedule} · {connector.sourceMapping || "—"}
						</p>
						<div className="mt-2 flex items-center gap-3">
							<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
								<CheckCircle2 className="h-3 w-3 text-primary" />
								Token stored
							</span>
							{connector.lastRunAt && (
								<span className="text-[10px] text-muted-foreground">
									Last run: {formatDate(connector.lastRunAt)}
									{connector.lastRunStatus === "fail" && (
										<span className="text-destructive"> (failed)</span>
									)}
								</span>
							)}
						</div>
					</div>

					<div className="flex shrink-0 items-center gap-2">
						<toggleFetcher.Form method="post">
							<input type="hidden" name="intent" value="update" />
							<input type="hidden" name="id" value={connector.id} />
							<input
								type="hidden"
								name="enabled"
								value={connector.enabled ? "false" : "true"}
							/>
							<Button
								type="submit"
								variant="ghost"
								size="sm"
								className="h-8 text-xs"
								disabled={isToggling}
							>
								{isToggling ? (
									<Loader className="h-3 w-3 animate-spin" />
								) : connector.enabled ? (
									"Disable"
								) : (
									"Enable"
								)}
							</Button>
						</toggleFetcher.Form>
						<Button
							variant="ghost"
							size="sm"
							className="h-8 text-xs text-destructive hover:bg-destructive/5"
							onClick={() => onRemove(connector.id)}
						>
							Remove
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
