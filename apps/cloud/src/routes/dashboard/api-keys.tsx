import { AlertTriangle, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { getEnv } from "~/server/context.server";
import type { ApiKeyView } from "~/server/queries";
import {
	createApiKey,
	listApiKeysForAccount,
	revokeApiKey,
} from "~/server/queries";
import { requireUserWithAccount } from "~/server/session.server";
import { formatDate } from "~/utils/format";
import { CreateKeyDialog } from "./+components/create-key-dialog";
import { PageHeader } from "./+components/page-header";
import { RevealKeyDialog } from "./+components/reveal-key-dialog";
import { RevokeKeyDialog } from "./+components/revoke-key-dialog";
import type { Route } from "./+types/api-keys";

/**
 * API keys (SC3.x). Real DB-backed provisioning + revocation. The cloud stores
 * ONLY a salted sha256 lookup hash — the raw `tm_…` key is returned by the
 * create action EXACTLY ONCE and surfaced in a one-time reveal dialog; once the
 * dialog closes the key is unrecoverable (revoke + re-create is the only path).
 *
 * Both mutations are ownership-guarded (`accountId` scopes every write), so a
 * key id from elsewhere cannot touch another account's key. There is no
 * `lastSeen` field (tracking is deferred), so the list shows Created + Status
 * only. The list refreshes via loader revalidation after each action.
 */

export function meta(_: Route.MetaArgs) {
	return [{ title: "API Keys — TekMemo Cloud" }];
}

/** Server data: the account's API keys, newest first. */
export interface ApiKeysLoaderData {
	keys: ApiKeyView[];
}

/** Action response — a discriminated union over `intent`. */
export type ApiKeyActionData =
	| { intent: "create"; rawKey: string; row: ApiKeyView }
	| { intent: "revoke"; ok: boolean }
	| { intent: "error"; ok: false };

export async function loader({
	request,
	context,
}: Route.LoaderArgs): Promise<ApiKeysLoaderData> {
	const { db, account } = await requireUserWithAccount(
		request,
		getEnv(context),
	);
	const keys = account ? await listApiKeysForAccount(db, account.id) : [];
	return { keys };
}

/**
 * Create + revoke. Ownership is re-resolved server-side on every submission
 * (the signed-in account must own the key being revoked). Create returns the
 * one-time raw key so the route can surface it in the reveal dialog; revoke is
 * idempotent (revoking an already-revoked or foreign key is a no-op).
 */
export async function action({
	request,
	context,
}: Route.ActionArgs): Promise<ApiKeyActionData> {
	const env = getEnv(context);
	const { db, account } = await requireUserWithAccount(request, env);
	const form = await request.formData();
	const intent = String(form.get("intent") ?? "");

	if (!account) {
		return { intent: "error", ok: false };
	}

	if (intent === "create") {
		const label = String(form.get("label") ?? "");
		const { rawKey, row } = await createApiKey(db, {
			accountId: account.id,
			label,
			salt: env.TEKMEMO_API_KEY_SALT ?? "",
		});
		return { intent: "create", rawKey, row };
	}

	if (intent === "revoke") {
		const keyId = String(form.get("keyId") ?? "");
		if (keyId) {
			await revokeApiKey(db, account.id, keyId);
		}
		return { intent: "revoke", ok: true };
	}

	return { intent: "error", ok: false };
}

export default function ApiKeysPage({ loaderData }: Route.ComponentProps) {
	const { keys } = loaderData;
	const createFetcher = useFetcher<ApiKeyActionData>();
	const revokeFetcher = useFetcher<ApiKeyActionData>();

	// The one-time raw key lifted out of the create result to drive the reveal
	// dialog. `null` outside the reveal moment. The useEffect is the bridge from
	// the fetcher's async result to the reveal dialog's open state.
	const [createdKey, setCreatedKey] = useState<{
		rawKey: string;
		label: string;
	} | null>(null);
	const [revokeId, setRevokeId] = useState<string | null>(null);

	useEffect(() => {
		if (createFetcher.data?.intent === "create") {
			setCreatedKey({
				rawKey: createFetcher.data.rawKey,
				label: createFetcher.data.row.label ?? "Unlabeled",
			});
		}
	}, [createFetcher]);

	// Optimistically grey a key the moment its revoke submission fires, before
	// the action returns and the loader revalidates.
	const revokingId = revokeFetcher.formData?.get("keyId");
	const isRevoking = (id: string) =>
		revokingId != null && String(revokingId) === id;

	return (
		<div className="p-6">
			<PageHeader
				title="API Keys"
				subtitle="Account-wide. Keys authenticate all sync operations."
				action={<CreateKeyDialog createFetcher={createFetcher} />}
			/>

			<div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
				<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
				<p className="text-xs leading-normal text-primary/80">
					Raw API keys are shown <strong>only once at creation</strong>. We
					store a salted SHA-256 hash. Treat keys like passwords — never commit
					them to version control.
				</p>
			</div>

			<Card>
				<CardContent className="p-0">
					{keys.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
							<KeyRound className="h-8 w-8 text-muted-foreground/40" />
							<p className="text-sm font-medium text-foreground">
								No API keys yet
							</p>
							<p className="max-w-sm text-xs text-muted-foreground">
								Create a key to authenticate{" "}
								<code className="font-mono text-[10px]">tekmemo push</code> from
								your machines and CI.
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="px-5 py-3 text-xs">Label</TableHead>
									<TableHead className="px-5 py-3 text-xs hidden sm:table-cell">
										Key
									</TableHead>
									<TableHead className="px-5 py-3 text-xs hidden md:table-cell">
										Created
									</TableHead>
									<TableHead className="px-5 py-3 text-xs">Status</TableHead>
									<TableHead className="px-5 py-3 text-xs text-right">
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{keys.map((key) => (
									<TableRow
										key={key.id}
										className={
											key.revokedAt || isRevoking(key.id) ? "opacity-50" : ""
										}
									>
										<TableCell className="px-5 py-3 text-xs">
											<div className="flex items-center gap-2">
												<KeyRound className="h-4 w-4 shrink-0 text-primary/80" />
												<span className="font-medium text-foreground">
													{key.label ?? "Unlabeled"}
												</span>
											</div>
										</TableCell>
										<TableCell className="px-5 py-3 text-xs hidden sm:table-cell">
											<code className="font-mono text-[10px] text-muted-foreground">
												{key.lastFour ? `tm_…${key.lastFour}` : "tm_…"}
											</code>
										</TableCell>
										<TableCell className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell">
											{formatDate(key.createdAt)}
										</TableCell>
										<TableCell className="px-5 py-3 text-xs">
											{key.revokedAt ? (
												<Badge
													variant="destructive"
													className="h-5 px-1.5 py-0 text-[10px] leading-none"
												>
													Revoked
												</Badge>
											) : (
												<Badge
													variant="outline"
													className="h-5 px-1.5 py-0 text-[10px] leading-none border-primary/30 bg-primary/5 text-primary"
												>
													Active
												</Badge>
											)}
										</TableCell>
										<TableCell className="px-5 py-3 text-right text-xs">
											{!key.revokedAt && (
												<Button
													size="sm"
													variant="ghost"
													className="h-8 text-xs text-destructive hover:bg-destructive/5 hover:text-destructive"
													onClick={() => setRevokeId(key.id)}
												>
													Revoke
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<RevealKeyDialog
				createdKey={createdKey}
				onClose={() => setCreatedKey(null)}
			/>
			<RevokeKeyDialog
				revokeId={revokeId}
				onClose={() => setRevokeId(null)}
				revokeFetcher={revokeFetcher}
			/>
		</div>
	);
}
