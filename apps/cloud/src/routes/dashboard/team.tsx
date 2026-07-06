import { env } from "cloudflare:workers";
import { useState } from "react";
import { getDB } from "~/.server/db";
import { INVITATION_TTL_DAYS, sendTeamInvitationMail } from "~/.server/email";
import {
	createInvitation,
	getMembership,
	listPendingInvitations,
	listTeamMembers,
	listTeamsForAccount,
	type PendingInvitationView,
	removeTeamMember,
	revokeInvitation,
	type TeamMemberView,
	TeamMutationError,
	type TeamSummary,
	updateMemberRole,
} from "~/.server/queries";
import { requireUserWithAccount } from "~/.server/session";
import { resolveCaps } from "~/lib/entitlements";
import { EmptyTeamState } from "./+components/empty-team-state";
import { MembersSection } from "./+components/members-section";
import { PageHeader } from "./+components/page-header";
import { PendingInvitations } from "./+components/pending-invitations";
import { RemoveMemberDialog } from "./+components/remove-member-dialog";
import { RevokeInviteDialog } from "./+components/revoke-invite-dialog";
import { SeatBanner } from "./+components/seat-banner";
import { TeamSwitcher } from "./+components/team-switcher";
import type { Route } from "./+types/team";
import {
	buildAcceptUrl,
	hashInviteToken,
	mintInviteToken,
	resolveRequestedTeamId,
	teamErrorMessage,
} from "./+utils/team";

/**
 * Team management (SC7). The `/dashboard/team` route: a team switcher (owned +
 * joined teams), the member roster, pending email invitations, and the admin
 * actions (invite-by-email, change role, remove) — all role + seat gated via the
 * query layer (`server/queries/teams.ts`). Every mutation re-resolves ownership
 * server-side on submit, so a tampered form field can't reach another team.
 *
 * Inviting mints a single-use, expiring token (hashed, never stored raw — the
 * API-key discipline), persists it, and emails the accept link via the Plunk
 * transport. Acceptance happens at `/team/accept?token=…` (a separate route that
 * checks the accepter's email matches the invite — no hijack via forwarded link).
 *
 * Seat gating is plan-derived (`resolveCaps(account.plan).maxSeats`): Free/Pro =
 * 1 seat (collaboration is Teams-only), so individual plans see an upgrade CTA
 * instead of the invite button. This wires the UI to the same entitlement SSOT
 * the data path uses (ADR 0006 §12.3 — numeric caps, never `plan ===` checks).
 *
 * @see docs/adr/0011-managed-runtime-sequencing.md — Phase 2 collaboration model.
 */

export function meta(_: Route.MetaArgs) {
	return [{ title: "Team — Memo FS Cloud" }];
}

/** Server data: the switcher teams, the selected team's roster + invites + seats. */
export interface TeamLoaderData {
	teams: TeamSummary[];
	selectedTeamId: string | null;
	selectedTeamName: string;
	/** The signed-in account's role on the selected team (drives admin actions). */
	myRole: "owner" | "admin" | "member" | null;
	members: TeamMemberView[];
	invitations: PendingInvitationView[];
	seatsUsed: number;
	maxSeats: number;
	plan: "free" | "pro" | "teams";
}

/** Action response — a discriminated union over `intent`. */
export type TeamActionData =
	| { intent: "invite"; ok: true; invitation: PendingInvitationView }
	| { intent: "revoke"; ok: true }
	| { intent: "role"; ok: true }
	| { intent: "remove"; ok: true }
	| { intent: "error"; ok: false; message: string };

export async function loader({
	request,
}: Route.LoaderArgs): Promise<TeamLoaderData> {
	const { account } = await requireUserWithAccount(request);
	const db = getDB();
	const plan = account?.plan ?? "free";

	// No account means no teams (provisioning raced). Degrade to an empty state
	// rather than blocking the user out of their dashboard.
	if (!account) {
		return {
			teams: [],
			selectedTeamId: null,
			selectedTeamName: "",
			myRole: null,
			members: [],
			invitations: [],
			seatsUsed: 0,
			maxSeats: resolveCaps(plan).maxSeats,
			plan,
		};
	}

	const teams = await listTeamsForAccount(db, account.id);
	const ownedIds = teams.filter((t) => t.isOwner).map((t) => t.id);
	const selectedTeamId = resolveRequestedTeamId(
		new URL(request.url).searchParams,
		ownedIds.length > 0 ? ownedIds : teams.map((t) => t.id),
	);

	const selected = teams.find((t) => t.id === selectedTeamId) ?? null;
	const maxSeats = resolveCaps(plan).maxSeats;

	if (!selected) {
		return {
			teams,
			selectedTeamId: null,
			selectedTeamName: "",
			myRole: null,
			members: [],
			invitations: [],
			seatsUsed: 0,
			maxSeats,
			plan,
		};
	}

	const [members, invitations, seatsUsed, myMembership] = await Promise.all([
		listTeamMembers(db, selected.id),
		listPendingInvitations(db, selected.id),
		listTeamMembers(db, selected.id).then((m) => m.length),
		getMembership(db, selected.id, account.id),
	]);

	return {
		teams,
		selectedTeamId: selected.id,
		selectedTeamName: selected.name,
		// `myRole` is non-null for an accepted member; the switcher only lists
		// accessible teams so this is always set in practice.
		myRole: myMembership?.acceptedAt ? myMembership.role : null,
		members,
		invitations,
		seatsUsed,
		maxSeats,
		plan,
	};
}

/**
 * The four team mutations: invite (mint + email), revoke invite, change role,
 * remove member. Each re-resolves ownership server-side via the query layer's
 * role + seat guards; a `TeamMutationError` becomes a 400 with a user-facing
 * message. Ownership is never trusted from the form.
 */
export async function action({
	request,
}: Route.ActionArgs): Promise<TeamActionData> {
	const { user, account } = await requireUserWithAccount(request);
	const db = getDB();
	const form = await request.formData();
	const intent = String(form.get("intent") ?? "");
	const teamId = String(form.get("teamId") ?? "");

	if (!account || !teamId) {
		return { intent: "error", ok: false, message: "Missing account or team." };
	}

	try {
		if (intent === "invite") {
			const email = String(form.get("email") ?? "")
				.trim()
				.toLowerCase();
			const role = (
				String(form.get("role") ?? "member") === "admin" ? "admin" : "member"
			) as "admin" | "member";
			if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
				return {
					intent: "error",
					ok: false,
					message: "Enter a valid email address.",
				};
			}

			const rawToken = mintInviteToken();
			const tokenHash = await hashInviteToken(rawToken, env.API_KEY_SALT ?? "");
			const expiresAt = new Date(
				Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
			).toISOString();

			const { invitation } = await createInvitation(db, {
				teamId,
				email,
				role,
				actorId: account.id,
				maxSeats: resolveCaps(account.plan).maxSeats,
				rawToken,
				tokenHash,
				expiresAt,
			});

			// Email the accept link. Best-effort: a Plunk failure after the invite
			// row exists is logged, not surfaced as a hard error — the owner can
			// re-invite (which re-sends). The row is the source of truth.
			const teamName = String(form.get("teamName") ?? "the team");
			try {
				await sendTeamInvitationMail({
					email,
					url: buildAcceptUrl(
						env.CLOUD_PUBLIC_BASE_URL ?? env.BETTER_AUTH_URL,
						rawToken,
					),
					teamName,
					inviterName: user.name ?? "A team member",
				});
			} catch (err) {
				console.error("[team] invitation email send failed", {
					teamId,
					to: email,
					err: err instanceof Error ? err.message : String(err),
				});
			}

			return { intent: "invite", ok: true, invitation };
		}

		if (intent === "revoke") {
			const invitationId = String(form.get("invitationId") ?? "");
			await revokeInvitation(db, teamId, invitationId, account.id);
			return { intent: "revoke", ok: true };
		}

		if (intent === "role") {
			const memberAccountId = String(form.get("memberAccountId") ?? "");
			const role = (
				String(form.get("role") ?? "member") === "admin" ? "admin" : "member"
			) as "admin" | "member";
			await updateMemberRole(db, teamId, memberAccountId, role, account.id);
			return { intent: "role", ok: true };
		}

		if (intent === "remove") {
			const memberAccountId = String(form.get("memberAccountId") ?? "");
			await removeTeamMember(db, teamId, memberAccountId, account.id);
			return { intent: "remove", ok: true };
		}

		return { intent: "error", ok: false, message: "Unknown action." };
	} catch (err) {
		if (err instanceof TeamMutationError) {
			// A typed query-layer rejection → surface as an inline error. The
			// discriminated union carries `ok: false`; the HTTP status stays 200 so
			// the fetcher resolves with the message (Conform-free inline rendering).
			return {
				intent: "error",
				ok: false,
				message: teamErrorMessage(err.code),
			};
		}
		throw err; // unexpected — let the app envelope handle it.
	}
}

export default function TeamPage({ loaderData }: Route.ComponentProps) {
	const {
		teams,
		selectedTeamId,
		selectedTeamName,
		myRole,
		members,
		invitations,
		seatsUsed,
		maxSeats,
		plan,
	} = loaderData;

	const [removeTarget, setRemoveTarget] = useState<TeamMemberView | null>(null);
	const [revokeTarget, setRevokeTarget] =
		useState<PendingInvitationView | null>(null);

	const canAdmin = myRole === "owner" || myRole === "admin";
	const seatsFull = seatsUsed >= maxSeats;
	const collaborationUnlocked = plan === "teams";

	return (
		<div className="p-6">
			<PageHeader
				title="Team"
				subtitle="Manage members and invitations for this workspace."
				action={
					teams.length > 0 ? (
						<TeamSwitcher teams={teams} selectedTeamId={selectedTeamId} />
					) : null
				}
			/>

			{teams.length === 0 ? (
				<EmptyTeamState />
			) : (
				<>
					<SeatBanner
						seatsUsed={seatsUsed}
						maxSeats={maxSeats}
						collaborationUnlocked={collaborationUnlocked}
					/>
					<MembersSection
						members={members}
						seatsUsed={seatsUsed}
						maxSeats={maxSeats}
						canAdmin={canAdmin}
						selectedTeamId={selectedTeamId}
						onRemoveMember={setRemoveTarget}
					/>
					{canAdmin && (
						<PendingInvitations
							invitations={invitations}
							selectedTeamId={selectedTeamId}
							selectedTeamName={selectedTeamName}
							seatsFull={seatsFull}
							collaborationUnlocked={collaborationUnlocked}
							onRevokeInvite={setRevokeTarget}
						/>
					)}
				</>
			)}

			<RemoveMemberDialog
				target={removeTarget}
				teamId={selectedTeamId}
				onClose={() => setRemoveTarget(null)}
			/>
			<RevokeInviteDialog
				target={revokeTarget}
				teamId={selectedTeamId}
				onClose={() => setRevokeTarget(null)}
			/>
		</div>
	);
}
