import type { PendingInvitationView } from "~/.server/queries";
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
import { InviteMemberDialog } from "./invite-member-dialog";
import { RoleBadge } from "./role-badge";

/** The pending invitations card — table of sent invites with revoke action. */
export function PendingInvitations({
	invitations,
	selectedTeamId,
	selectedTeamName,
	seatsFull,
	collaborationUnlocked,
	onRevokeInvite,
}: {
	invitations: PendingInvitationView[];
	selectedTeamId: string | null;
	selectedTeamName: string;
	seatsFull: boolean;
	collaborationUnlocked: boolean;
	onRevokeInvite: (invitation: PendingInvitationView) => void;
}) {
	return (
		<Card>
			<CardContent className="p-0">
				<div className="flex items-center justify-between px-5 py-3">
					<h3 className="text-sm font-semibold">Pending invitations</h3>
					<InviteMemberDialog
						teamId={selectedTeamId}
						teamName={selectedTeamName}
						disabled={seatsFull || !collaborationUnlocked}
						reason={
							!collaborationUnlocked
								? "Upgrade to Teams to invite collaborators."
								: seatsFull
									? "Seat limit reached."
									: null
						}
					/>
				</div>
				{invitations.length === 0 ? (
					<p className="px-5 py-6 text-center text-xs text-muted-foreground">
						No pending invitations.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="px-5 py-3 text-xs">Email</TableHead>
								<TableHead className="px-5 py-3 text-xs">Role</TableHead>
								<TableHead className="px-5 py-3 text-xs hidden md:table-cell">
									Expires
								</TableHead>
								<TableHead className="px-5 py-3 text-xs text-right">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{invitations.map((inv) => (
								<TableRow key={inv.id}>
									<TableCell className="px-5 py-3 text-xs font-medium">
										{inv.email}
									</TableCell>
									<TableCell className="px-5 py-3 text-xs">
										<RoleBadge role={inv.role} />
									</TableCell>
									<TableCell className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell">
										{formatDate(inv.expiresAt)}
									</TableCell>
									<TableCell className="px-5 py-3 text-right">
										<button
											type="button"
											onClick={() => onRevokeInvite(inv)}
											className="h-8 rounded px-2 text-xs text-destructive hover:bg-destructive/5"
										>
											Revoke
										</button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
