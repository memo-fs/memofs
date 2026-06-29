import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import type { TeamActionData } from "../team";

/**
 * The "invite a member" dialog (SC7). Owns its email + role state and submits
 * via a route-scoped fetcher (no navigation). The action mints the accept token,
 * persists the hashed invite, and emails the link; on success the dialog resets
 * and the loader revalidates to show the new pending invite. Action errors
 * (already-a-member, seat limit, invalid email) render inline.
 *
 * @param teamId      the selected team the invite opens membership on.
 * @param teamName    the team name (carried through to the email copy).
 * @param disabled    true when the plan is individual (collaboration locked) or
 *                    the team is at its seat cap — renders a tooltip + disabled
 *                    trigger instead of the dialog.
 * @param reason      the upgrade/limit message shown when `disabled`.
 */
export function InviteMemberDialog({
	teamId,
	teamName,
	disabled,
	reason,
}: {
	teamId: string | null;
	teamName: string;
	disabled: boolean;
	reason: string | null;
}) {
	const fetcher = useFetcher<TeamActionData>();
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<"admin" | "member">("member");
	const submitting = fetcher.state !== "idle";
	const errorMessage =
		fetcher.data?.intent === "error" ? fetcher.data.message : null;

	// On a successful invite, close + reset; the parent loader revalidates.
	useEffect(() => {
		if (fetcher.data?.intent === "invite") {
			setOpen(false);
			setEmail("");
			setRole("member");
		}
	}, [fetcher.data]);

	const close = () => {
		setOpen(false);
		setEmail("");
		setRole("member");
	};

	return (
		<>
			<Button
				size="sm"
				onClick={() => setOpen(true)}
				disabled={disabled}
				className="h-9 text-xs"
				title={reason ?? undefined}
			>
				<Plus className="mr-1.5 h-4 w-4" /> Invite member
			</Button>

			<Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="text-base font-semibold">
							Invite a member
						</DialogTitle>
						<DialogDescription className="text-xs">
							We&apos;ll email {teamName ? `"${teamName}"` : "the team"} a
							single-use link. They join the moment they accept.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<div className="space-y-1.5">
							<Label htmlFor="invite-email" className="text-xs">
								Email
							</Label>
							<Input
								id="invite-email"
								type="email"
								placeholder="teammate@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="h-9 text-xs"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="invite-role" className="text-xs">
								Role
							</Label>
							<Select
								value={role}
								onValueChange={(v) => setRole(v as "admin" | "member")}
							>
								<SelectTrigger id="invite-role" className="h-9 w-full text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="member">
										Member — can sync + read
									</SelectItem>
									<SelectItem value="admin">
										Admin — can also manage members
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{errorMessage ? (
							<p className="text-xs text-destructive">{errorMessage}</p>
						) : null}
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="outline"
							size="sm"
							className="h-9 text-xs"
							onClick={close}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							className="h-9 text-xs"
							disabled={!email || submitting}
							onClick={() =>
								fetcher.submit(
									{
										intent: "invite",
										teamId: teamId ?? "",
										teamName,
										email,
										role,
									},
									{ method: "post" },
								)
							}
						>
							{submitting ? "Sending…" : "Send invite"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
