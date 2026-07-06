/**
 * `requestId` middleware — stamps one correlation id on every request.
 *
 * Strategy (in priority order):
 *   1. honor an inbound `x-request-id` header if present (so a caller — proxy,
 *      CLI, dashboard fetch — can thread its own trace id end-to-end);
 *   2. otherwise mint a UUIDv4 via Web Crypto (`crypto.randomUUID()` is a
 *      Worker global, no Node polyfill needed).
 *
 * The id is exposed three ways so it survives the whole hop:
 *   - `c.set("requestId", id)` — readable by handlers / the envelope helpers;
 *   - `c.header("x-request-id", id)` on the RESPONSE — read back by
 *     `MemofsCloudTransport` to populate `error.requestId` client-side;
 *   - echoed into the JSON envelope `meta.requestId` by the `json()` helpers.
 *
 * `id` MUST be a reasonable header value: alphanumeric + a few safe separators,
 * capped at 128 chars. We accept any inbound header that already matches that
 * shape; anything else is ignored and a fresh id is minted (defensive against
 * header-injection-style garbage).
 */
import type { MiddlewareHandler } from "hono";

const REQUEST_ID_MAX_LENGTH = 128;
// Allow uuids, ulids, trace-style ids (parent/child, dashes, hex). Conservative
// allow-list keeps the value header-safe without rejecting real trace formats.
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/-]{1,128}$/;

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
	const inbound = c.req.header("x-request-id");
	const id =
		inbound &&
		REQUEST_ID_PATTERN.test(inbound) &&
		inbound.length <= REQUEST_ID_MAX_LENGTH
			? inbound
			: crypto.randomUUID();
	c.set("requestId", id);
	c.header("x-request-id", id);
	await next();
};
