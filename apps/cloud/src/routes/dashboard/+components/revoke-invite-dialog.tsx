import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import type { PendingInvitationView } from "~/server/queries";
import type { TeamActionData } from "../team";

/**
 * The revoke-invitation confirmation dialog. A pending invite is a single-use
 * token; revoking deletes the row so any cached/pasted link stops resolving.
 * Mirrors the remove-member dialog — the only difference is the action intent
 * and the target shape.
 *
 * @param target        the pending invitation to revoke, or null when closed.
 * @param teamId        the selected team.
 * @param onClose       clears the pending selection.
 */
export function RevokeInviteDialog({
	target,
	teamId,
	onClose,
}: {
	target: PendingInvitationView | null;
	teamId: string | null;
	onClose: () => void;
}) {
	const fetcher = useFetcher<TeamActionData>();
	const revoking = fetcher.state !== "idle";

	return (
		<Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="text-base font-semibold">
						Revoke this invitation?
					</DialogTitle>
					<DialogDescription className="text-xs">
						The link sent to {target?.email} will stop working immediately. They
						won&apos;t be notified.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						variant="outline"
						size="sm"
						className="h-9 text-xs"
						onClick={onClose}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						size="sm"
						className="h-9 text-xs"
						disabled={revoking || !target || !teamId}
						onClick={() => {
							if (!target || !teamId) return;
							fetcher.submit(
								{ intent: "revoke", teamId, invitationId: target.id },
								{ method: "post" },
							);
							onClose();
						}}
					>
						{revoking ? "Revoking…" : "Revoke invite"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
