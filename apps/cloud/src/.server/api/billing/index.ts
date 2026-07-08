/**
 * Polar billing sub-app — ADR 0006 / ADR 0011 Phase 2.
 *
 * Three routes:
 *   - `POST /v1/billing/webhook` — Polar-authenticated by signature. We call
 *     `@polar-sh/sdk/webhooks`'s `validateEvent(rawBody, headers, secret)` so the
 *     secret is read per-request from `c.env.POLAR_WEBHOOK_SECRET` (the app is
 *     built once; the env is per-request). On a bad signature it throws
 *     `WebhookVerificationError` → 403. On a valid event we switch on its type
 *     and re-apply the linked account's plan + caps.
 *   - `GET  /v1/billing/checkout` — redirects to a Polar checkout. Built inline
 *     per-request via `@polar-sh/hono`'s `Checkout` so the token/server come from
 *     `c.env`. The dashboard calls with `?products=&customerId=`; the metadata
 *     carrying `memofs_account_id` + `memofs_plan` is supplied by the dashboard
 *     route as a URL-encoded JSON query param.
 *   - `GET  /v1/billing/portal` — redirects to the Polar customer portal.
 *
 * Mounted in `src/api/index.ts` under `/v1/billing`. DB access is handled via
 * `getDB()` calls in the query functions — no middleware needed since `getDB()`
 * is memoized per isolate.
 *
 * @see docs/adr/0006-pricing-and-entitlements.md — tiers, caps, Polar (MoR).
 * @see {@link ../../server/queries/billing} — account-lookup + plan-apply helpers.
 * @see {@link ../../server/entitlements} — `resolveCaps`, the SSOT.
 */

import { Checkout, CustomerPortal } from "@polar-sh/hono";
import {
	validateEvent,
	WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { eq } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { secret } from "../../../lib/env";
import { getDB } from "../../db";
import { accounts, type PlanTier } from "../../db/schema";
import { getAccountForUser } from "../../queries/account";
import {
	applyPlanToAccount,
	getAccountById,
	getAccountByPolarCustomerId,
	isPlanMetadataValue,
	setPolarCustomerId,
} from "../../queries/billing";
import { createAuthFromEnv } from "../../session";
import type { ApiEnv } from "../index";
import { json, jsonError } from "../json";
import { requestIdMiddleware } from "../middleware/request-id";

/**
 * Session-based auth guard for checkout/portal routes.
 *
 * Verifies the request carries a valid Better Auth session and that the
 * `account_id` query parameter (if present) belongs to that session's user.
 * This prevents IDOR: an attacker cannot access another user's billing portal.
 */
async function requireSessionAccount(
	c: Context<ApiEnv>,
): Promise<string | null> {
	const auth = createAuthFromEnv();
	const result = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!result) return null;
	const account = await getAccountForUser(result.user.id);
	return account?.id ?? null;
}

/** Read the plan tier from subscription metadata (`memofs_plan`), or null. */
function planFromMetadata(
	metadata: Record<string, unknown> | null | undefined,
): PlanTier | null {
	const raw = metadata?.memofs_plan;
	return isPlanMetadataValue(raw) ? raw : null;
}

/**
 * Resolve the Memo FS account for a subscription event, record the Polar
 * customer link, and apply the plan. Resolution order: `metadata.memofs_account_id`
 * (direct, set at checkout) → the account already linked to this Polar
 * `customerId`. If neither resolves, the event is ignored (Polar retries; a
 * later event carrying the link catches up). If metadata has no valid tier, the
 * event is ignored (no silent downgrade on a malformed event).
 */
async function handleSubscriptionEvent(
	event: {
		data: { customerId: string; metadata?: Record<string, unknown> | null };
	},
	plan: PlanTier | null,
): Promise<void> {
	const metaAccountId =
		typeof event.data.metadata?.memofs_account_id === "string"
			? event.data.metadata.memofs_account_id
			: undefined;
	const account =
		(metaAccountId ? await getAccountById(metaAccountId) : null) ??
		(await getAccountByPolarCustomerId(event.data.customerId));
	if (!account || !plan) return;
	await setPolarCustomerId(account.id, event.data.customerId);
	await applyPlanToAccount(account.id, plan);
}

export const billingApp = new Hono<ApiEnv>()
	.use("*", requestIdMiddleware)

	// --- POST /webhook --------------------------------------------------------
	// Polar-authenticated by signature: validateEvent checks the webhook secret
	// and throws WebhookVerificationError on a mismatch (→ 403). The body must be
	// the raw bytes (not JSON-parsed) so the signature verifies.
	.post("/webhook", async (c) => {
		const webhookSecret = secret("POLAR_WEBHOOK_SECRET");
		if (!webhookSecret) {
			return jsonError(
				c,
				500,
				"billing_not_configured",
				"POLAR_WEBHOOK_SECRET is not set.",
			);
		}
		const rawBody = await c.req.text();
		let event: ReturnType<typeof validateEvent>;
		try {
			event = validateEvent(
				rawBody,
				Object.fromEntries(c.req.raw.headers.entries()) as Record<
					string,
					string
				>,
				webhookSecret,
			);
		} catch (err) {
			if (err instanceof WebhookVerificationError) {
				return jsonError(
					c,
					403,
					"webhook_signature_invalid",
					"Invalid webhook signature.",
				);
			}
			throw err;
		}
		const data = event.data as {
			customerId?: string;
			id?: string;
			metadata?: Record<string, unknown> | null;
		};
		const metadata = data.metadata ?? null;

		switch (event.type) {
			case "subscription.created":
			case "subscription.updated":
			case "subscription.active": {
				if (data.customerId) {
					await handleSubscriptionEvent(event, planFromMetadata(metadata));
				}
				break;
			}
			case "subscription.canceled":
			case "subscription.revoked": {
				// Cancellation/revocation → downgrade to free (re-apply free caps).
				if (data.customerId) {
					await handleSubscriptionEvent(event, "free");
				}
				break;
			}
			case "customer.created": {
				// Record the Polar customer id on the linked account if the checkout
				// stamped our account id. No plan change (that's the subscription events).
				const metaAccountId =
					typeof metadata?.memofs_account_id === "string"
						? metadata.memofs_account_id
						: undefined;
				if (metaAccountId && data.id) {
					await setPolarCustomerId(metaAccountId, data.id);
				}
				break;
			}
			default:
				// Events we don't act on (checkout, order, benefit, …) — acknowledged.
				break;
		}
		return json(c, { received: true });
	})

	// --- GET /checkout --------------------------------------------------------
	// Polar checkout redirect. Built per-request so the token/server come from
	// c.env. The dashboard supplies ?products=&customerId=&metadata=<json>.
	// Session-authenticated: the caller must be signed in (the dashboard loader
	// handles the redirect-to-login bounce, but we re-check here to prevent
	// direct API hits from bypassing auth).
	.get("/checkout", async (c: Context<ApiEnv>) => {
		const accountId = await requireSessionAccount(c);
		if (!accountId) {
			return jsonError(c, 401, "unauthorized", "Authentication required.");
		}
		const handler = Checkout({
			accessToken: secret("POLAR_ACCESS_TOKEN"),
			successUrl: c.env.CLOUD_PUBLIC_BASE_URL
				? `${c.env.CLOUD_PUBLIC_BASE_URL}/dashboard/billing?upgraded=1`
				: undefined,
			server: c.env.POLAR_ENV,
		});
		return handler(c);
	})

	// --- GET /portal ----------------------------------------------------------
	// Polar customer portal. getCustomerId resolves the Polar id from the account
	// linked to ?account_id=<id> (the dashboard route supplies it after auth).
	// Session-authenticated: the account_id must belong to the signed-in user.
	.get("/portal", async (c: Context<ApiEnv>) => {
		const sessionAccountId = await requireSessionAccount(c);
		if (!sessionAccountId) {
			return jsonError(c, 401, "unauthorized", "Authentication required.");
		}
		const handler = CustomerPortal({
			accessToken: secret("POLAR_ACCESS_TOKEN"),
			getCustomerId: async (ctx: Context<ApiEnv>) => {
				const db = getDB();
				const requestedAccountId = ctx.req.query("account_id");
				if (!requestedAccountId) return "";
				// IDOR guard: the requested account must belong to the session user.
				if (requestedAccountId !== sessionAccountId) return "";
				// The Polar customer id was recorded on the account by the webhook
				// when the subscription started; the portal needs that id.
				const row = await db
					.select({ polarCustomerId: accounts.polarCustomerId })
					.from(accounts)
					.where(eq(accounts.id, requestedAccountId))
					.limit(1);
				return row[0]?.polarCustomerId ?? "";
			},
			server: c.env.POLAR_ENV,
			returnUrl: c.env.CLOUD_PUBLIC_BASE_URL
				? `${c.env.CLOUD_PUBLIC_BASE_URL}/dashboard/billing`
				: undefined,
		});
		return handler(c);
	});
