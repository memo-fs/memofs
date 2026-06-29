import { Info, Users } from "lucide-react";
import { useState } from "react";
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
import { INVITATION_TTL_DAYS } from "~/emails/render-team-invitation";
import { getEnv } from "~/server/context.server";
import { createMailer } from "~/server/email";
import { resolveCaps } from "~/server/entitlements";
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
} from "~/server/queries";
import { requireUserWithAccount } from "~/server/session.server";
import { formatDate } from "~/utils/format";
import { InviteMemberDialog } from "./+components/invite-member-dialog";
import { PageHeader } from "./+components/page-header";
import { RemoveMemberDialog } from "./+components/remove-member-dialog";
import { RevokeInviteDialog } from "./+components/revoke-invite-dialog";
import { RoleMenu } from "./+components/role-menu";
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
	return [{ title: "Team — TekMemo Cloud" }];
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
	context,
}: Route.LoaderArgs): Promise<TeamLoaderData> {
	const env = getEnv(context);
	const { db, account } = await requireUserWithAccount(request, env);
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
	context,
}: Route.ActionArgs): Promise<TeamActionData> {
	const env = getEnv(context);
	const { db, account } = await requireUserWithAccount(request, env);
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
			const tokenHash = await hashInviteToken(
				rawToken,
				env.TEKMEMO_API_KEY_SALT ?? "",
			);
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
			const mailer = createMailer(env);
			const teamName = String(form.get("teamName") ?? "the team");
			try {
				await mailer.sendTeamInvitation({
					email,
					url: buildAcceptUrl(
						env.CLOUD_PUBLIC_BASE_URL ?? env.BETTER_AUTH_URL,
						rawToken,
					),
					inviteeName: email.split("@")[0],
					teamName,
					inviterName: account.id, // display name not on the account row; id is stable
					role,
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
												<div className="font-medium text-foreground">
													{m.name}
												</div>
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
																onClick={() => setRemoveTarget(m)}
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

					{canAdmin && (
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
												<TableHead className="px-5 py-3 text-xs">
													Email
												</TableHead>
												<TableHead className="px-5 py-3 text-xs">
													Role
												</TableHead>
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
															onClick={() => setRevokeTarget(inv)}
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

/** The role badge — color-coded so owner/admin/member read at a glance. */
function RoleBadge({ role }: { role: "owner" | "admin" | "member" }) {
	if (role === "owner") {
		return (
			<Badge className="h-5 px-1.5 py-0 text-[10px] leading-none bg-primary text-primary-foreground hover:bg-primary">
				Owner
			</Badge>
		);
	}
	if (role === "admin") {
		return (
			<Badge className="h-5 px-1.5 py-0 text-[10px] leading-none border-primary/30 bg-primary/5 text-primary">
				Admin
			</Badge>
		);
	}
	return (
		<Badge
			variant="outline"
			className="h-5 px-1.5 py-0 text-[10px] leading-none"
		>
			Member
		</Badge>
	);
}

/** The seat-capacity + upgrade banner above the member table. */
function SeatBanner({
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

/** Empty state when the account has no teams yet (pre-provisioning edge case). */
function EmptyTeamState() {
	return (
		<Card>
			<CardContent className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
				<Users className="h-8 w-8 text-muted-foreground/40" />
				<p className="text-sm font-medium text-foreground">No team yet</p>
				<p className="max-w-sm text-xs text-muted-foreground">
					Your personal workspace will appear here once your account is
					provisioned. Refresh in a moment.
				</p>
			</CardContent>
		</Card>
	);
}
