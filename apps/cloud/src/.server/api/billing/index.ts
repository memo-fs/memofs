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
 * Mounted in `src/api/index.ts` under `/v1/billing`. The webhook + portal need
 * the per-request DB (`dbMiddleware`, same as sync); checkout is a Polar-side
 * redirect and does not touch the DB.
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
import { type Context, Hono, type MiddlewareHandler } from "hono";
import { getDB } from "../../db";
import { accounts, type PlanTier } from "../../db/schema";
import {
	applyPlanToAccount,
	getAccountById,
	getAccountByPolarCustomerId,
	isPlanMetadataValue,
	setPolarCustomerId,
} from "../../queries/billing";
import type { ApiEnv } from "../index";
import { json, jsonError } from "../json";
import { invariant } from "../../../utils/misc";

/** Per-request drizzle client, mirroring the sync router's `dbMiddleware`. */
const dbMiddleware: MiddlewareHandler<ApiEnv> = async (c, next) => {
	if (!c.get("db")) c.set("db", getDB());
	await next();
};

/** Read `c.var.db`, throwing if a wiring bug left it unset. */
function requireDb(c: Context<ApiEnv>) {
	const db = c.get("db");
	invariant(db, "db middleware must run before the billing handler");
	return db;
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
	db: ReturnType<typeof requireDb>,
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
		(metaAccountId ? await getAccountById(db, metaAccountId) : null) ??
		(await getAccountByPolarCustomerId(db, event.data.customerId));
	if (!account || !plan) return;
	await setPolarCustomerId(db, account.id, event.data.customerId);
	await applyPlanToAccount(db, account.id, plan);
}

export const billingApp = new Hono<ApiEnv>()
	.use("*", dbMiddleware)

	// --- POST /webhook --------------------------------------------------------
	// Polar-authenticated by signature: validateEvent checks the webhook secret
	// and throws WebhookVerificationError on a mismatch (→ 403). The body must be
	// the raw bytes (not JSON-parsed) so the signature verifies.
	.post("/webhook", async (c) => {
		const secret = c.env.POLAR_WEBHOOK_SECRET;
		if (!secret) {
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
				secret,
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
		const db = requireDb(c);
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
					await handleSubscriptionEvent(db, event, planFromMetadata(metadata));
				}
				break;
			}
			case "subscription.canceled":
			case "subscription.revoked": {
				// Cancellation/revocation → downgrade to free (re-apply free caps).
				if (data.customerId) {
					await handleSubscriptionEvent(db, event, "free");
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
					await setPolarCustomerId(db, metaAccountId, data.id);
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
	.get("/checkout", async (c: Context<ApiEnv>) => {
		const handler = Checkout({
			accessToken: c.env.POLAR_ACCESS_TOKEN,
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
	.get("/portal", async (c: Context<ApiEnv>) => {
		const handler = CustomerPortal({
			accessToken: c.env.POLAR_ACCESS_TOKEN,
			getCustomerId: async (ctx: Context<ApiEnv>) => {
				const db = ctx.get("db");
				const accountId = ctx.req.query("account_id");
				if (!db || !accountId) return "";
				// The Polar customer id was recorded on the account by the webhook
				// when the subscription started; the portal needs that id.
				const row = await db
					.select({ polarCustomerId: accounts.polarCustomerId })
					.from(accounts)
					.where(eq(accounts.id, accountId))
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
