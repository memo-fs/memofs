import { env } from "cloudflare:workers";
import { parseWithZod } from "@conform-to/zod/v4";
import { eq } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { redirect, useFetcher, useRouteLoaderData } from "react-router";
import { getDB } from "~/.server/db";
import { user } from "~/.server/db/schema";
import { purgeAccount } from "~/.server/queries/account-deletion";
import { createAuthFromEnv, requireUser } from "~/.server/session";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { buildNoindexMeta } from "~/lib/seo";
import { formatRelative } from "~/utils/misc";
import { DeleteAccountDialog } from "./+components/delete-account-dialog";
import { PageHeader } from "./+components/page-header";
import { ProfileForm } from "./+components/profile-form";
import type { Route as DashboardRoute } from "./+types/_layout";
import type { Route } from "./+types/settings";
import { ProfileSchema } from "./+utils/settings";

/**
 * Settings (SC3.6). Account-wide. The profile is editable (name via Conform +
 * Zod v4; email is read-only — it's the passwordless login identity, SC4.1).
 * Security shows real active sessions (Better Auth `listSessions`, revocable
 * via `revokeSession`) + an honest "2FA is N/A under passwordless" note.
 *
 * Danger-zone account deletion is wired: R2 blob purge (content-addressed
 * aware — shared blobs survive) + DB cascade + Better Auth user deletion,
 * gated by typed confirmation ("DELETE") re-validated server-side.
 */

export function meta() {
	return buildNoindexMeta("Settings — Memo FS Cloud");
}

/**
 * One active session row, shaped for the sessions list. The `token` is needed
 * server-side to revoke a specific session; it is never rendered to the user
 * (only device/IP/age are shown). `current` marks the session whose token
 * matches the request cookie.
 */
export interface SessionView {
	id: string;
	token: string;
	device: string;
	ipAddress: string | null;
	createdAt: string;
	current: boolean;
}

/** Server data: the profile snapshot + live active sessions. */
export interface SettingsLoaderData {
	user: {
		name: string;
		email: string;
		image: string | null;
	};
	sessions: SessionView[];
}

export async function loader({
	request,
}: Route.LoaderArgs): Promise<SettingsLoaderData> {
	const user = await requireUser(request);
	const auth = createAuthFromEnv();

	// The active session's token (from the cookie) identifies the current row.
	const cookieToken = parseSessionToken(request);

	// Better Auth resolves the user from the session cookie server-side, so this
	// only ever returns the signed-in user's own sessions — ownership is enforced
	// by the framework, not by us.
	const result = await auth.api.listSessions({ headers: request.headers });
	const sessions: SessionView[] = (Array.isArray(result) ? result : []).map(
		(s) => ({
			id: s.id,
			token: s.token,
			device: describeUserAgent(s.userAgent ?? null),
			ipAddress: s.ipAddress ?? null,
			createdAt:
				s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
			current: s.token === cookieToken,
		}),
	);

	return {
		user: { name: user.name, email: user.email, image: user.image },
		sessions,
	};
}

/**
 * Handles two intents:
 *
 * - `update-profile`: validates the name via the shared `ProfileSchema`
 *   (Conform + Zod v4) and forwards to Better Auth `updateUser`. Email is
 *   never mutated here — it's the passwordless login identity (SC4.1).
 * - `revoke-session`: revokes a session by token. The auth instance resolves
 *   ownership from the cookie, so a token from another user's session is
 *   rejected by Better Auth.
 */
export async function action({
	request,
}: Route.ActionArgs): Promise<{ ok: boolean; error?: string } | Response> {
	const db = getDB();
	const auth = createAuthFromEnv();
	const sessionUser = await requireUser(request);
	const form = await request.formData();
	const intent = String(form.get("intent") ?? "");

	if (intent === "update-profile") {
		const submission = parseWithZod(form, { schema: ProfileSchema });
		if (submission.status !== "success") {
			return Response.json(
				{ ok: false, error: submission.error?.name?.[0] ?? "Invalid name." },
				{ status: StatusCodes.BAD_REQUEST },
			);
		}
		await auth.api.updateUser({
			headers: request.headers,
			body: { name: submission.value.name },
		});
		return { ok: true };
	}

	if (intent === "revoke-session") {
		const token = String(form.get("token") ?? "");
		if (!token) return { ok: false };
		await auth.api.revokeSession({ headers: request.headers, body: { token } });
		return { ok: true };
	}

	if (intent === "delete-account") {
		// Server-side re-validation of the typed confirmation (client can't bypass).
		const confirm = String(form.get("confirm") ?? "");
		if (confirm !== "DELETE") {
			return Response.json(
				{ ok: false, error: 'Type "DELETE" to confirm.' },
				{ status: StatusCodes.BAD_REQUEST },
			);
		}
		const accountId = sessionUser.accountId;
		if (!accountId) {
			return Response.json(
				{ ok: false, error: "No account found to delete." },
				{ status: StatusCodes.NOT_FOUND },
			);
		}
		if (!env.BLOBS) {
			throw new Error("R2 BLOBS bucket is not bound to the worker.");
		}
		await purgeAccount(env.BLOBS, accountId);
		await db.delete(user).where(eq(user.id, sessionUser.id));
		throw redirect("/login");
	}

	return Response.json(
		{ ok: false, error: "Unknown intent." },
		{ status: StatusCodes.BAD_REQUEST },
	);
}

export default function SettingsPage({ loaderData }: Route.ComponentProps) {
	const { user, sessions } = loaderData;
	const revokeFetcher = useFetcher<{ ok: boolean }>();
	const dashboard = useRouteLoaderData<
		DashboardRoute.ComponentProps["loaderData"]
	>("routes/dashboard/_layout");
	const [showDelete, setShowDelete] = useState(false);

	const revokingToken = revokeFetcher.formData?.get("token");
	const visibleSessions =
		revokingToken != null
			? sessions.filter((s) => s.token !== String(revokingToken))
			: sessions;

	return (
		<div className="p-6">
			<PageHeader
				title="Settings"
				subtitle="Account-wide identity and security."
			/>
			<section className="mb-8 space-y-4">
				<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Profile
				</h3>
				<Card>
					<CardContent className="space-y-4 p-5">
						<ProfileForm name={user.name} email={user.email} />
					</CardContent>
				</Card>
			</section>
			<Separator className="my-8" />
			<SecuritySection
				visibleSessions={visibleSessions}
				revokeFetcher={revokeFetcher}
			/>
			<Separator className="my-8" />
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<ShieldAlert className="h-4 w-4 text-destructive" />
					<h3 className="text-sm font-semibold uppercase tracking-wider text-destructive">
						Danger zone
					</h3>
				</div>
				<Card className="border-destructive/30 bg-destructive/5">
					<CardContent className="p-5">
						<p className="mb-1 text-xs font-semibold text-destructive">
							Delete account
						</p>
						<p className="mb-4 text-[11px] leading-normal text-muted-foreground">
							Permanently deletes your account, all synced blobs (R2), and all
							database records. This cannot be undone.
						</p>
						<Button
							variant="destructive"
							size="sm"
							className="h-9 text-xs"
							onClick={() => setShowDelete(true)}
						>
							Delete my account
						</Button>
					</CardContent>
				</Card>
			</section>
			<DeleteAccountDialog
				open={showDelete}
				onOpenChange={setShowDelete}
				accountId={dashboard?.account?.id ?? null}
			/>
		</div>
	);
}

function SecuritySection({
	visibleSessions,
	revokeFetcher,
}: {
	visibleSessions: SessionView[];
	revokeFetcher: ReturnType<typeof useFetcher<{ ok: boolean }>>;
}) {
	return (
		<section className="mb-8 space-y-6">
			<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
				Security
			</h3>
			<Card>
				<CardContent className="flex items-center gap-3 p-5">
					<ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
					<div>
						<p className="text-xs font-semibold text-foreground">
							Passwordless authentication
						</p>
						<p className="mt-0.5 text-[10px] leading-normal text-muted-foreground">
							You sign in via email magic link or GitHub/Google. There's no
							password to change or forget.
						</p>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-xs font-semibold">
						Active sessions
					</CardTitle>
				</CardHeader>
				<CardContent className="divide-y divide-border/40 border-t border-border/40 p-0">
					{visibleSessions.length === 0 ? (
						<p className="px-5 py-6 text-center text-xs text-muted-foreground">
							No active sessions.
						</p>
					) : (
						visibleSessions.map((s) => (
							<div
								key={s.id}
								className="flex items-center justify-between px-5 py-3 text-xs"
							>
								<div>
									<div className="flex items-center gap-2">
										<p className="font-semibold text-foreground">{s.device}</p>
										{s.current && (
											<Badge className="h-4 px-1 py-0 text-[9px] border-primary/20 bg-primary/10 text-primary hover:bg-primary/15">
												Current
											</Badge>
										)}
									</div>
									<p className="mt-0.5 text-[10px] text-muted-foreground">
										{s.ipAddress ?? "IP unknown"} ·{" "}
										{formatRelative(s.createdAt)}
									</p>
								</div>
								{!s.current && (
									<Button
										size="sm"
										variant="ghost"
										className="h-8 text-xs text-destructive hover:bg-destructive/5 hover:text-destructive"
										onClick={() =>
											revokeFetcher.submit(
												{ intent: "revoke-session", token: s.token },
												{ method: "post" },
											)
										}
									>
										Revoke
									</Button>
								)}
							</div>
						))
					)}
				</CardContent>
			</Card>
			<Card>
				<CardContent className="flex items-center justify-between p-5">
					<div>
						<p className="text-xs font-semibold text-foreground">
							Two-factor authentication
						</p>
						<p className="mt-0.5 text-[10px] text-muted-foreground">
							N/A under passwordless — the magic link is the possession factor,
							email is the knowledge factor.
						</p>
					</div>
					<Badge variant="secondary" className="h-5 px-1 py-0 text-[9px]">
						Not applicable
					</Badge>
				</CardContent>
			</Card>
		</section>
	);
}

/** Extracts the Better Auth session token from the request cookie (to flag the current session). */
function parseSessionToken(request: Request): string | null {
	const cookie = request.headers.get("cookie") ?? "";
	const match = cookie.match(/better-auth\.session_token=([^;]+)/);
	return match ? match[1] : null;
}

/** Turns a raw User-Agent into a short device label, or "Unknown device". */
function describeUserAgent(ua: string | null): string {
	if (!ua) return "Unknown device";
	const browser = /edg/i.test(ua)
		? "Edge"
		: /chrome|crios/i.test(ua)
			? "Chrome"
			: /firefox|fxios/i.test(ua)
				? "Firefox"
				: /safari/i.test(ua)
					? "Safari"
					: "Browser";
	const os = /mac os|macintosh/i.test(ua)
		? "macOS"
		: /windows/i.test(ua)
			? "Windows"
			: /linux/i.test(ua)
				? "Linux"
				: /android/i.test(ua)
					? "Android"
					: /iphone|ipad|ios/i.test(ua)
						? "iOS"
						: "Device";
	return `${browser} on ${os}`;
}
