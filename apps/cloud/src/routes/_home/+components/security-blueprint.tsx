import { Cpu, Lock, ShieldCheck } from "lucide-react";
import { SectionHeading } from "~/components/site/terminal";
import { Section } from "~/components/site/visuals";

/**
 * SecurityBlueprint — marketing section explaining local-first data ownership,
 * encryption, and isolated cloud execution runtimes.
 */
export function SecurityBlueprint() {
	return (
		<Section className="py-20">
			<SectionHeading
				eyebrow="Security & Privacy"
				title={<>Your data belongs to you. Period.</>}
				lede="Memo FS Cloud is built on a local-first foundation. We sync and execute query capabilities securely without lock-in or silent exposure."
			/>

			<div className="mt-12 grid gap-6 sm:grid-cols-3">
				{/* Step 1 */}
				<div className="bg-premium-card hover-glow-gold p-6 flex flex-col justify-between rounded-none transition-all duration-300">
					<div>
						<div className="size-10 bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold mb-4 rounded-none">
							<ShieldCheck className="size-5" />
						</div>
						<h3 className="font-mono text-sm font-semibold text-foreground mb-2">
							1. Local Ownership
						</h3>
						<p className="text-xs leading-relaxed text-muted-foreground">
							All memories are stored on your local disk as plaintext markdown
							files under{" "}
							<code className="text-accent-gold font-mono bg-accent-gold/5 px-1.5 py-0.5 border border-accent-gold/20 text-[10px]">
								.memofs/
							</code>
							. You can search, edit, or delete them anytime using your normal
							editor.
						</p>
					</div>
				</div>

				{/* Step 2 */}
				<div className="bg-premium-card hover-glow-gold p-6 flex flex-col justify-between rounded-none transition-all duration-300">
					<div>
						<div className="size-10 bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold mb-4 rounded-none">
							<Lock className="size-5" />
						</div>
						<h3 className="font-mono text-sm font-semibold text-foreground mb-2">
							2. Encrypted Transport
						</h3>
						<p className="text-xs leading-relaxed text-muted-foreground">
							Sync transport is TLS-encrypted. Files are content-addressed and
							tracked via cryptographic hashes, protecting against silent
							modifications or corruption.
						</p>
					</div>
				</div>

				{/* Step 3 */}
				<div className="bg-premium-card hover-glow-gold p-6 flex flex-col justify-between rounded-none transition-all duration-300">
					<div>
						<div className="size-10 bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-accent-gold mb-4 rounded-none">
							<Cpu className="size-5" />
						</div>
						<h3 className="font-mono text-sm font-semibold text-foreground mb-2">
							3. Ephemeral Runtimes
						</h3>
						<p className="text-xs leading-relaxed text-muted-foreground">
							The serverless cloud query runtime spins up ephemeral, secure
							containers to calculate vector embeddings and extract connections,
							ensuring isolation and fast semantic recall.
						</p>
					</div>
				</div>
			</div>
		</Section>
	);
}
