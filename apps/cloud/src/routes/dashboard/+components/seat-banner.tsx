import { Info } from "lucide-react";

/** The seat-capacity + upgrade banner above the member table. */
export function SeatBanner({
	seatsUsed,
	maxSeats,
	collaborationUnlocked,
}: {
	seatsUsed: number;
	maxSeats: number;
	collaborationUnlocked: boolean;
}) {
	if (!collaborationUnlocked) {
		return (
			<div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
				<Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
				<p className="text-xs leading-normal text-primary/80">
					Collaboration is a <strong>Teams</strong> feature. Upgrade to invite
					members and share this workspace.
				</p>
			</div>
		);
	}
	const pct = maxSeats > 0 ? (seatsUsed / maxSeats) * 100 : 0;
	if (pct < 80) return null;
	return (
		<div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
			<Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
			<p className="text-xs leading-normal text-primary/80">
				This team is near its seat limit ({seatsUsed}/{maxSeats}). Remove a
				member or contact billing to raise the cap.
			</p>
		</div>
	);
}
