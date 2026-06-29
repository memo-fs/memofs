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
import type { TeamMemberView } from "~/server/queries";
import type { TeamActionData } from "../team";

/**
 * The remove-member confirmation dialog. Receives the target member (or null to
 * stay closed) and submits via the route's `remove` action. The action
 * re-checks ownership server-side, so the only thing the client contributes is
 * the selection. Last-owner protection is enforced in the query layer — the
 * dialog never opens for an owner (the table hides the Remove button on owners).
 *
 * @param target   the member to remove, or null when closed.
 * @param teamId   the selected team.
 * @param onClose  clears the pending selection.
 */
export function RemoveMemberDialog({
	target,
	teamId,
	onClose,
}: {
	target: TeamMemberView | null;
	teamId: string | null;
	onClose: () => void;
}) {
	const fetcher = useFetcher<TeamActionData>();
	const removing = fetcher.state !== "idle";
	const errorMessage =
		fetcher.data?.intent === "error" ? fetcher.data.message : null;

	return (
		<Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="text-base font-semibold">
						Remove this member?
					</DialogTitle>
					<DialogDescription className="text-xs">
						{target?.name} ({target?.email}) will lose access to this
						team&apos;s projects immediately. They can be re-invited later.
					</DialogDescription>
				</DialogHeader>
				{errorMessage ? (
					<p className="text-xs text-destructive">{errorMessage}</p>
				) : null}
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
						disabled={removing || !target || !teamId}
						onClick={() => {
							if (!target || !teamId) return;
							fetcher.submit(
								{
									intent: "remove",
									teamId,
									memberAccountId: target.accountId,
								},
								{ method: "post" },
							);
							onClose();
						}}
					>
						{removing ? "Removing…" : "Remove member"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
