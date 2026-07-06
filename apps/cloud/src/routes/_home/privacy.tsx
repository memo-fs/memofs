import { Section } from "~/components/site/visuals";
import { Card, CardContent } from "~/components/ui/card";
import { SITE_LINKS } from "~/lib/site";
import type { Route } from "./+types/privacy";

/**
 * Privacy policy (SC2).
 *
 * A real, product-grounded v1 privacy policy — not boilerplate. It reflects the
 * locked architecture: the cloud stores METADATA ONLY (Turso) + content-
 * addressed file blobs (R2); it never parses, embeds, indexes, or runs recall
 * on user memory. Payment data is handled by Polar (Merchant of Record), not
 * us. Connector tokens are encrypted server-side and never synced to files.
 *
 * This is a living legal document; final wording should be reviewed by counsel
 * before launch, but the data-flow facts below are derived from the shipped
 * architecture (ADR 0005, ADR 0006, cloud-sync-and-refactor.md §12.2).
 */
const SECTIONS = [
	{
		h: "1. The short version",
		body: (
			<p>
				Memo FS Cloud is a{" "}
				<strong className="text-foreground">file replica</strong>. When you
				sync, we receive byte-for-byte copies of your{" "}
				<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
					.memofs/
				</code>{" "}
				files and store them so your other devices can pull them. We never
				parse, embed, index, or run recall on your memory — that engine runs
				locally, on your machine, for $0. We store the minimum metadata needed
				to mirror files and authenticate you.
			</p>
		),
	},
	{
		h: "2. What we store",
		list: [
			<>
				<strong className="text-foreground">File blobs</strong> — the raw bytes
				of your synced{" "}
				<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
					.memofs/
				</code>{" "}
				files, stored content-addressed in Cloudflare R2 under their sha256
				hash.
			</>,
			<>
				<strong className="text-foreground">File metadata</strong> — the path,
				sha256, size, and last-synced timestamp for each file, stored in our
				metadata database (Turso/libSQL). This is the cloud manifest: a map of
				paths to blob hashes.
			</>,
			<>
				<strong className="text-foreground">Account metadata</strong> — your
				account ID, plan, storage/connector entitlements, and Polar customer ID
				(once billing is attached).
			</>,
			<>
				<strong className="text-foreground">Hashed API keys</strong> — we never
				store raw API keys. We store a salted sha256 hash used to authenticate
				sync requests. The raw key is shown to you exactly once, at
				provisioning.
			</>,
		],
	},
	{
		h: "3. What we do not do",
		list: [
			<>We do not parse, read, or index the contents of your memory files.</>,
			<>We do not run embedding, recall, graph traversal, or LLM extraction.</>,
			<>We do not train models on your data.</>,
			<>We do not sell or share your data with third parties.</>,
		],
	},
	{
		h: "4. Connectors and tokens",
		body: (
			<p>
				If you configure a connector (GitHub, Notion), the connector runs{" "}
				<strong className="text-foreground">locally</strong> on your machine.
				The access token is stored server-side under an opaque reference and
				fetched live at run time — it is never written to your synced files and
				never stored in R2. We hold only enough to resolve the token when your
				local runtime asks.
			</p>
		),
	},
	{
		h: "5. Payments",
		body: (
			<p>
				Paid plans are billed through{" "}
				<strong className="text-foreground">Polar</strong>, our Merchant of
				Record. Polar handles checkout, payment processing, tax, and invoices.
				We receive your Polar customer ID and plan entitlements — we never see
				or store your card number.
			</p>
		),
	},
	{
		h: "6. Your data, your control",
		body: (
			<p>
				Because your memory lives locally as plain files, you always hold a
				complete copy. You can stop syncing at any time. Deleting your account
				purges your stored blobs and metadata from R2 and our database within 24
				hours — a full GDPR-style erasure available from the dashboard's danger
				zone.
			</p>
		),
	},
	{
		h: "7. Infrastructure",
		body: (
			<p>
				Storage and compute run on Cloudflare (R2 for blobs, Workers for the
				API). Metadata runs on Turso (libSQL). These providers process data
				under their own data-protection agreements as our subprocessors.
			</p>
		),
	},
	{
		h: "8. Cookies",
		body: (
			<p>
				We use{" "}
				<strong className="text-foreground">functional cookies only</strong> —
				to keep you signed in and protect against CSRF. We set no advertising,
				analytics, or cross-site tracking cookies, so there is no consent banner
				to click through.
			</p>
		),
	},
	{
		h: "9. Contact",
		body: (
			<p>
				Memo FS Cloud is operated by{" "}
				<strong className="text-foreground">TekBreed</strong>, the data
				controller. For questions about this policy, or to access, correct, or
				delete your personal data, email{" "}
				<a
					href={SITE_LINKS.privacyEmail}
					className="text-primary underline-offset-4 hover:underline"
				>
					privacy@memofs.dev
				</a>
				. We never route personal-data requests through public channels.
			</p>
		),
	},
] as const;

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Privacy Policy — Memo FS Cloud" },
		{
			name: "description",
			content:
				"Memo FS Cloud privacy policy. The cloud stores file bytes and metadata only — it never parses or indexes your memory.",
		},
	];
}

export default function Privacy(_props: Route.ComponentProps) {
	return (
		<Section className="py-20">
			<header className="flex max-w-3xl flex-col gap-3 mx-auto">
				<div className="flex items-center gap-2.5">
					<span
						aria-hidden
						className="size-1.5 rounded-full bg-primary animate-pulse"
					/>
					<span className="font-heading text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">
						Legal
					</span>
				</div>
				<h1 className="font-heading font-bold tracking-[-0.03em] leading-[1.02] text-balance text-4xl text-foreground sm:text-5xl">
					Privacy Policy
				</h1>
				<p className="font-mono text-xs text-muted-foreground">
					Last updated: June 23, 2026
				</p>
			</header>

			<div className="mt-10 max-w-3xl mx-auto">
				<Card>
					<CardContent className="p-8">
						<div className="flex flex-col gap-8 text-sm leading-relaxed text-muted-foreground">
							{SECTIONS.map((s) => (
								<section key={s.h}>
									<h2 className="font-mono text-base font-semibold text-foreground">
										{s.h}
									</h2>
									<div className="mt-3">
										{"body" in s && s.body ? (
											<div className="text-sm">{s.body}</div>
										) : null}
										{"list" in s && s.list ? (
											<ul className="mt-2 flex flex-col gap-2 pl-1">
												{s.list.map((li, i) => (
													// biome-ignore lint/suspicious/noArrayIndexKey: static legal copy that never reorders
													<li key={`${s.h}-${i}`} className="flex gap-2.5">
														<span
															aria-hidden
															className="mt-1 size-1 shrink-0 rounded-full bg-primary/60"
														/>
														<span>{li}</span>
													</li>
												))}
											</ul>
										) : null}
									</div>
								</section>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</Section>
	);
}
