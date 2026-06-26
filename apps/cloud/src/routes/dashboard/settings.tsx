import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useFetcher, useRouteLoaderData } from "react-router";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { createDb } from "~/db/index.server";
import { getEnv } from "~/server/context.server";
import { createAuthFromEnv, requireUser } from "~/server/session.server";
import { formatRelative, userInitials } from "~/utils/format";
import { PageHeader } from "./+components/page-header";
import type { Route as DashboardRoute } from "./+types/_layout";
import type { Route } from "./+types/settings";

/**
 * Settings (SC3.6). Account-wide. The profile is read live from the signed-in
 * user (name / email / avatar). Under passwordless auth (SC4.1) there is NO
 * password to change — the Security section reflects that honestly: real active
 * sessions (Better Auth `listSessions`, revocable via `revokeSession`), and an
 * explicit "2FA is N/A under passwordless" note rather than a fake toggle.
 *
 * Danger-zone account deletion is surfaced as an honest "not yet wired" state:
 * the R2 blob-purge + cascade path doesn't exist yet (it lands with the deploy
 * unblock work), so the button is disabled rather than silently doing nothing.
 */

export function meta(_: Route.MetaArgs) {
	return [{ title: "Settings — TekMemo Cloud" }];
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
	context,
}: Route.LoaderArgs): Promise<SettingsLoaderData> {
	const user = await requireUser(request, getEnv(context));
	const env = getEnv(context);
	const db = createDb(env);
	const auth = createAuthFromEnv(env, db);

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
 * Revokes a session by token. The auth instance resolves ownership from the
 * cookie, so a token from another user's session is rejected by Better Auth —
 * we don't trust the client-supplied token beyond using it as the selector.
 */
export async function action({
	request,
	context,
}: Route.ActionArgs): Promise<{ ok: boolean }> {
	await requireUser(request, getEnv(context));
	const env = getEnv(context);
	const db = createDb(env);
	const auth = createAuthFromEnv(env, db);
	const form = await request.formData();
	const token = String(form.get("token") ?? "");
	if (!token) return { ok: false };

	await auth.api.revokeSession({ headers: request.headers, body: { token } });
	return { ok: true };
}

export default function SettingsPage({ loaderData }: Route.ComponentProps) {
	const { user, sessions } = loaderData;
	const revokeFetcher = useFetcher<{ ok: boolean }>();

	// Reuse the layout's already-resolved account/usage for the danger-zone note.
	const dashboard = useRouteLoaderData<
		DashboardRoute.ComponentProps["loaderData"]
	>("routes/dashboard/_layout");

	const [showDelete, setShowDelete] = useState(false);
	const initials = userInitials(user.name);

	// Drop a session optimistically the moment its revoke submission fires.
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

			{/* Profile (read-only at v1) */}
			<section className="mb-8 space-y-4">
				<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Profile
				</h3>
				<Card>
					<CardContent className="space-y-4 p-5">
						<div className="flex items-center gap-4">
							<Avatar className="h-12 w-12">
								<AvatarFallback className="bg-primary/20 text-sm text-primary">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div>
								<p className="text-xs font-semibold text-foreground">
									{user.name}
								</p>
								<p className="text-[11px] text-muted-foreground">
									{user.email}
								</p>
							</div>
						</div>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="name" className="text-xs">
									Name
								</Label>
								<Input
									id="name"
									defaultValue={user.name}
									className="h-9 text-xs"
									disabled
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="email" className="text-xs">
									Email
								</Label>
								<Input
									id="email"
									type="email"
									defaultValue={user.email}
									className="h-9 text-xs"
									disabled
								/>
							</div>
						</div>
						<p className="text-[10px] text-muted-foreground">
							Profile editing isn't wired at v1. Email is your login identity
							(passwordless, SC4.1).
						</p>
					</CardContent>
				</Card>
			</section>

			<Separator className="my-8" />

			{/* Security */}
			<section className="mb-8 space-y-6">
				<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Security
				</h3>

				{/* Passwordless explainer (replaces the old fake password-change form) */}
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

				{/* Active sessions (real, revocable) */}
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
											<p className="font-semibold text-foreground">
												{s.device}
											</p>
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
													{ token: s.token },
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

				{/* 2FA — honest N/A note under passwordless */}
				<Card>
					<CardContent className="flex items-center justify-between p-5">
						<div>
							<p className="text-xs font-semibold text-foreground">
								Two-factor authentication
							</p>
							<p className="mt-0.5 text-[10px] text-muted-foreground">
								N/A under passwordless — the magic link is the possession
								factor, email is the knowledge factor.
							</p>
						</div>
						<Badge variant="secondary" className="h-5 px-1 py-0 text-[9px]">
							Not applicable
						</Badge>
					</CardContent>
				</Card>
			</section>

			<Separator className="my-8" />

			{/* Danger zone */}
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

			{/* Delete — honest "not yet wired" dialog (R2 purge path lands with deploy unblock) */}
			<Dialog open={showDelete} onOpenChange={setShowDelete}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="text-base font-semibold">
							Delete your account?
						</DialogTitle>
						<DialogDescription className="text-xs">
							Self-serve account deletion isn't wired at v1 — the R2 blob-purge
							+ cascade path ships with the deploy-unblock work. Contact us and
							we'll complete it for you within 24 hours.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2 text-[11px] text-muted-foreground">
						<p>
							Email{" "}
							<a
								href="mailto:privacy@tekbreed.com"
								className="text-primary hover:underline"
							>
								privacy@tekbreed.com
							</a>{" "}
							from {user.email} and we'll purge all projects, files, connector
							configs, and API keys.
						</p>
						{dashboard?.account && (
							<p className="font-mono text-[10px]">
								Account: {dashboard.account.id}
							</p>
						)}
					</div>
					<Button
						variant="outline"
						size="sm"
						className="h-9 text-xs"
						onClick={() => setShowDelete(false)}
					>
						Close
					</Button>
				</DialogContent>
			</Dialog>
		</div>
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
