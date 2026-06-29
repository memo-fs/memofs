import { Check, ChevronDown } from "lucide-react";
import { useFetcher } from "react-router";
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
import type { TeamMemberView } from "~/server/queries";
import type { TeamActionData } from "../team";

/**
 * Per-member role menu (Admin/Member) for the roster table. Submits the route's
 * `role` action on selection via its own fetcher (no navigation). The owner role
 * cannot be granted or changed from this surface (ownership transfer is a
 * deferred Phase 3 admin action), so owners render a disabled "Owner" label.
 *
 * @param member    the member row this menu controls.
 * @param teamId    the selected team.
 * @param disabled  true when the member is an owner (no role change offered).
 */
export function RoleMenu({
	member,
	teamId,
	disabled,
}: {
	member: TeamMemberView;
	teamId: string | null;
	disabled: boolean;
}) {
	const fetcher = useFetcher<TeamActionData>();
	const updating = fetcher.state !== "idle";

	const change = (role: "admin" | "member") => {
		if (!teamId || role === member.role) return;
		fetcher.submit(
			{ intent: "role", teamId, memberAccountId: member.accountId, role },
			{ method: "post" },
		);
	};

	if (disabled || member.role === "owner") {
		return (
			<span className="inline-flex h-8 items-center px-2 text-xs text-muted-foreground">
				Owner
			</span>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
					disabled={updating}
				>
					{member.role === "admin" ? "Admin" : "Member"}
					<ChevronDown className="h-3.5 w-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				<DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
					Change role
				</DropdownMenuLabel>
				{(["member", "admin"] as const).map((role) => (
					<DropdownMenuItem
						key={role}
						onClick={() => change(role)}
						className={cn(
							"flex items-center justify-between text-xs",
							role === member.role && "bg-muted",
						)}
					>
						<span>
							{role === "admin"
								? "Admin — manage members"
								: "Member — sync + read"}
						</span>
						{role === member.role ? (
							<Check className="h-3.5 w-3.5 text-primary" />
						) : null}
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="text-[10px] text-muted-foreground"
					disabled
				>
					Owner can&apos;t be assigned here
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
