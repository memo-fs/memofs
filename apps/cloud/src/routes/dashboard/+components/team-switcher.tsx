import { Check, ChevronDown, Crown } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import type { TeamSummary } from "~/.server/queries";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

/**
 * The team switcher for the `/dashboard/team` header. Lists every team the
 * account owns or has joined; selecting one sets `?teamId=` (the loader's
 * selection key) without a navigation round-trip. The personal team (owned) is
 * flagged with a crown so it's distinguishable from joined teams.
 *
 * Pure-presentational: the teams come from the loader; selection is a query
 * param so it survives reloads and deep-links.
 *
 * @param teams            the account's accessible teams.
 * @param selectedTeamId   the currently-selected team id (or null).
 */
export function TeamSwitcher({
	teams,
	selectedTeamId,
}: {
	teams: TeamSummary[];
	selectedTeamId: string | null;
}) {
	const [, setSearchParams] = useSearchParams();
	const selected = teams.find((t) => t.id === selectedTeamId) ?? teams[0];

	const select = (id: string) => {
		// Preserve other params (none today, but future-proof) and swap teamId.
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			next.set("teamId", id);
			return next;
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
					{selected?.isOwner ? (
						<Crown className="h-3.5 w-3.5 text-primary" />
					) : null}
					<span className="max-w-[140px] truncate">
						{selected?.name ?? "Select team"}
					</span>
					<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
					Your teams
				</DropdownMenuLabel>
				{teams.map((team) => (
					<DropdownMenuItem
						key={team.id}
						onClick={() => select(team.id)}
						className={cn(
							"flex items-center justify-between text-xs",
							team.id === selectedTeamId && "bg-muted",
						)}
					>
						<span className="flex items-center gap-2">
							{team.isOwner ? (
								<Crown className="h-3.5 w-3.5 text-primary" />
							) : null}
							<span className="truncate">{team.name}</span>
						</span>
						{team.id === selectedTeamId ? (
							<Check className="h-3.5 w-3.5 text-primary" />
						) : null}
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link
						to="/dashboard/billing"
						className="flex items-center text-xs text-muted-foreground"
					>
						Upgrade for more teams
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
