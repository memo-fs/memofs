/**
 * MX-record check via Cloudflare DNS-over-HTTPS (SC4.1 defense).
 *
 * A domain with no MX records can't receive the magic link, so sending to it is
 * pointless (and a vector for list bombing — an attacker points a signup at
 * thousands of unreachable domains). This rejects such domains at request time
 * rather than after Plunk bounces them.
 *
 * Uses Cloudflare's public DoH endpoint (`cloudflare-dns.com`), which is
 * reachable from the Worker and needs no API key. The query is scoped to MX so
 * it returns quickly and cheaply.
 *
 * Fail-open policy: on any DNS/transport error we return `true` (assume the
 * domain is reachable). Rationale — a DoH outage must not lock all signups out;
 * the disposable/format checks in {@link ../routes/_auth/+utils/email-validation}
 * still apply, and a bounce is recoverable downstream. False-positives on MX are
 * worse than false-negatives here.
 */

/** Cloudflare DNS-over-HTTPS JSON endpoint. */
const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";

/**
 * Whether `domain` has at least one MX record (i.e. can receive mail).
 *
 * @param domain  lowercase domain (no `@`), e.g. `"gmail.com"`.
 * @returns `true` when MX records exist (or the lookup failed open).
 */
export async function hasMxRecord(domain: string): Promise<boolean> {
	const url = `${DOH_ENDPOINT}?name=${encodeURIComponent(domain)}&type=MX`;
	try {
		const response = await fetch(url, {
			headers: { Accept: "application/dns-json" },
			// DoH is fast but we don't want a hung resolver to stall signup; the
			// Worker CPU limit is the backstop, this makes the intent explicit.
			cf: { cacheTtl: 60, cacheEverything: true },
		});
		if (!response.ok) return true;

		const data = (await response.json()) as { Answer?: unknown[] };
		// An empty/missing Answer means NOERROR with no records → no mail server.
		return Array.isArray(data.Answer) && data.Answer.length > 0;
	} catch {
		// Network/parse error — fail open (see module doc).
		return true;
	}
}
