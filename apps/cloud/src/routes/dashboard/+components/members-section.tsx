import type { TeamMemberView } from "~/.server/queries";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatDate } from "~/utils/misc";
import { RoleBadge } from "./role-badge";
import { RoleMenu } from "./role-menu";

/** The member roster card — table of accepted members with role + actions. */
export function MembersSection({
	members,
	seatsUsed,
	maxSeats,
	canAdmin,
	selectedTeamId,
	onRemoveMember,
}: {
	members: TeamMemberView[];
	seatsUsed: number;
	maxSeats: number;
	canAdmin: boolean;
	selectedTeamId: string | null;
	onRemoveMember: (member: TeamMemberView) => void;
}) {
	return (
		<Card className="mb-8">
			<CardContent className="p-0">
				<div className="flex items-center justify-between px-5 py-3">
					<h3 className="text-sm font-semibold">Members</h3>
					<Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
						{seatsUsed} of {maxSeats} seats
					</Badge>
				</div>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="px-5 py-3 text-xs">Member</TableHead>
							<TableHead className="px-5 py-3 text-xs">Role</TableHead>
							<TableHead className="px-5 py-3 text-xs hidden md:table-cell">
								Joined
							</TableHead>
							<TableHead className="px-5 py-3 text-xs text-right">
								Actions
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{members.map((m) => (
							<TableRow key={m.accountId}>
								<TableCell className="px-5 py-3 text-xs">
									<div className="font-medium text-foreground">{m.name}</div>
									<div className="text-muted-foreground">{m.email}</div>
								</TableCell>
								<TableCell className="px-5 py-3 text-xs">
									<RoleBadge role={m.role} />
								</TableCell>
								<TableCell className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell">
									{formatDate(m.createdAt)}
								</TableCell>
								<TableCell className="px-5 py-3 text-right">
									{canAdmin && (
										<div className="flex items-center justify-end gap-1">
											<RoleMenu
												member={m}
												teamId={selectedTeamId}
												disabled={m.role === "owner"}
											/>
											{m.role !== "owner" && (
												<button
													type="button"
													onClick={() => onRemoveMember(m)}
													className="h-8 rounded px-2 text-xs text-destructive hover:bg-destructive/5"
												>
													Remove
												</button>
											)}
										</div>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
