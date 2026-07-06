import { Section } from "~/components/site/visuals";
import { Card, CardContent } from "~/components/ui/card";
import { SITE_LINKS } from "~/lib/site";
import type { Route } from "./+types/terms";

/**
 * Terms of service (SC2).
 *
 * Required for a paid product + Polar as Merchant of Record. Reflects the
 * actual service boundary: Memo FS Cloud is a file-replica + sync service, not
 * a compute or AI provider; the local-first engine is open-source and MIT
 * licensed; billing is handled by Polar. Living legal text — review with
 * counsel before launch.
 */

const SECTIONS = [
	{
		h: "1. The service",
		body: (
			<p>
				Memo FS Cloud is a{" "}
				<strong className="text-foreground">
					file-replica and sync service
				</strong>
				. It stores byte-for-byte copies of your{" "}
				<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
					.memofs/
				</code>{" "}
				files and mirrors them across your devices. It does not run the memory
				engine — recall, graph, and extraction execute locally in the
				open-source runtime.
			</p>
		),
	},
	{
		h: "2. The open-source runtime",
		body: (
			<p>
				The Memo FS runtime (the local engine) is open-source software licensed
				under the MIT License, provided "as is" without warranty. These terms
				govern your use of the hosted Cloud service only; your use of the
				runtime is governed by its MIT license.
			</p>
		),
	},
	{
		h: "3. Your account",
		body: (
			<p>
				You must provide accurate information and keep your credentials secure.
				API keys authenticate sync requests — you are responsible for activity
				under your keys. Revoke any compromised key from the dashboard; revoked
				keys are immediately rejected by the sync API.
			</p>
		),
	},
	{
		h: "4. Acceptable use",
		body: <p>You agree not to:</p>,
		list: [
			<>Use the service to store or sync unlawful content.</>,
			<>
				Attempt to access, tamper with, or overload the service or another
				user's data.
			</>,
			<>Reverse-engineer, scrape, or resell the service.</>,
			<>Resell or sublicense access to the service.</>,
		],
	},
	{
		h: "5. Plans, entitlements, and billing",
		body: (
			<p>
				Plans are enforced as numeric entitlement caps (storage bytes and
				connector count). Paid plans are billed through{" "}
				<strong className="text-foreground">Polar</strong>, our Merchant of
				Record, which handles checkout, tax, invoices, and cancellation. We may
				adjust plan prices for new subscribers; existing subscriptions are
				honored under the terms in effect at renewal.
			</p>
		),
	},
	{
		h: "6. Data retention",
		body: (
			<p>
				Your synced files and metadata persist until you delete them. Deleting
				your account purges your stored blobs from R2 and your rows from our
				metadata database. See the{" "}
				<a
					href="/privacy"
					className="text-primary underline-offset-4 hover:underline"
				>
					Privacy Policy
				</a>{" "}
				for the full data picture.
			</p>
		),
	},
	{
		h: "7. Service availability",
		body: (
			<p>
				We strive for high availability but provide the service on a
				best-efforts basis. We may modify, suspend, or discontinue features with
				reasonable notice. Because your memory always lives locally as plain
				files, interruptions to the cloud never destroy your data.
			</p>
		),
	},
	{
		h: "8. Limitation of liability",
		body: (
			<p>
				To the maximum extent permitted by law, TekBreed is not liable for
				indirect, incidental, or consequential damages arising from your use of
				the service. Total liability is limited to the amount you paid in the
				preceding twelve months.
			</p>
		),
	},
	{
		h: "9. Changes to these terms",
		body: (
			<p>
				We may update these terms; material changes will be announced. Continued
				use after changes take effect constitutes acceptance.
			</p>
		),
	},
	{
		h: "10. Governing law",
		body: (
			<p>
				These terms and your use of Memo FS Cloud are governed by the laws of
				the jurisdiction in which{" "}
				<strong className="text-foreground">TekBreed</strong> is established.
				The specific governing law and venue will be confirmed with counsel
				before commercial launch.
			</p>
		),
	},
	{
		h: "11. Contact",
		body: (
			<p>
				Open an issue on the{" "}
				<a
					href={SITE_LINKS.github}
					className="text-primary underline-offset-4 hover:underline"
					rel="noreferrer"
					target="_blank"
				>
					public GitHub repository
				</a>
				.
			</p>
		),
	},
] as const;

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Terms of Service — Memo FS Cloud" },
		{
			name: "description",
			content:
				"Memo FS Cloud terms of service. A file-replica sync service; the local-first runtime is MIT-licensed open source.",
		},
	];
}

export default function Terms(_props: Route.ComponentProps) {
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
					Terms of Service
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

			<p className="mt-8 max-w-3xl border-t border-border pt-6 text-xs text-muted-foreground mx-auto">
				Living legal text reflecting the shipped Memo FS Cloud service as of
				June 2026. Review with counsel before any commercial launch.
			</p>
		</Section>
	);
}
