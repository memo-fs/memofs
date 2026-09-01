export function RuntimesSection() {
	return (
		<section
			id="runtimes"
			className="relative w-full border-t border-dashed border-border bg-background py-20 text-foreground sm:py-28 transition-colors duration-300"
		>
			<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="mb-16 text-center">
					<p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
						Runtimes
					</p>
					<h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						One engine, three storage modes
					</h2>
					<p className="mt-4 text-base text-muted-foreground max-w-2xl mx-auto">
						MemoFS is built on a unified store abstraction. Choose where your
						memory resides based on your workflow and access needs.
					</p>
				</div>

				{/* 3-Column Diagram Cards */}
				<div className="grid grid-cols-1 divide-y divide-border border border-dashed border-border md:grid-cols-3 md:divide-x md:divide-y-0">
					{/* Card 1: Local Storage Mode */}
					<div className="group relative flex flex-col justify-between p-8 transition-colors hover:bg-muted/60">
						<div>
							<div className="flex items-center justify-between">
								<span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
									RUNTIME 01
								</span>
								<span className="font-mono text-[10px] text-muted-foreground border border-border px-2 py-0.5 rounded bg-secondary">
									Offline First
								</span>
							</div>

							<div className="my-8 flex h-44 items-center justify-center">
								<svg
									viewBox="0 0 160 160"
									className="h-36 w-36 stroke-muted-foreground transition-transform duration-500 group-hover:scale-105 group-hover:stroke-foreground"
									fill="none"
									strokeWidth="1.2"
								>
									<title>Local Mode Diagram</title>
									<path
										d="M80 115 L135 90 L80 65 L25 90 Z"
										className="fill-muted"
									/>
									<path d="M25 90 L25 105 L80 130 L135 105 L135 90" />
									<text
										x="80"
										y="98"
										textAnchor="middle"
										fontSize="4"
										className="fill-muted-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										.memofs/ • git
									</text>
									<path
										d="M80 88 L125 68 L80 48 L35 68 Z"
										className="fill-card"
									/>
									<path d="M35 68 L35 74 L80 94 L125 74 L125 68" />
									<text
										x="80"
										y="72"
										textAnchor="middle"
										fontSize="3"
										className="fill-muted-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										nodes.jsonl
									</text>
									<path
										d="M80 76 L125 56 L80 36 L35 56 Z"
										className="fill-card"
									/>
									<path d="M35 56 L35 62 L80 82 L125 62 L125 56" />
									<path
										d="M80 64 L125 44 L80 24 L35 44 Z"
										className="fill-card"
									/>
									<line x1="60" y1="41" x2="95" y2="41" strokeOpacity="0.6" />
									<line x1="55" y1="46" x2="105" y2="46" strokeOpacity="0.6" />
									<line x1="60" y1="51" x2="90" y2="51" strokeOpacity="0.6" />
									<text
										x="80"
										y="38"
										textAnchor="middle"
										fontSize="3.5"
										className="fill-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										memory/*.md
									</text>
									<circle cx="80" cy="24" r="2" fill="currentColor" />
									<text
										x="92"
										y="25"
										fontSize="3"
										className="fill-muted-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										branch:main
									</text>
									<line
										x1="25"
										y1="90"
										x2="25"
										y2="44"
										strokeDasharray="3 3"
										strokeOpacity="0.35"
									/>
									<line
										x1="135"
										y1="90"
										x2="135"
										y2="44"
										strokeDasharray="3 3"
										strokeOpacity="0.35"
									/>
									<path
										d="M80 20 L135 44 L80 68 L25 44 Z"
										strokeDasharray="3 3"
										strokeOpacity="0.3"
									/>
								</svg>
							</div>

							<h3 className="text-lg font-semibold text-foreground">
								Local Storage Mode
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								All memory is stored directly on your project&apos;s filesystem
								as versioned markdown and JSON. Zero network latency, fully
								offline, and 100% git-trackable.
							</p>
						</div>
					</div>

					{/* Card 2: Hybrid Sync Mode */}
					<div className="group relative flex flex-col justify-between p-8 transition-colors hover:bg-muted/60">
						<div>
							<div className="flex items-center justify-between">
								<span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
									RUNTIME 02
								</span>
								<span className="font-mono text-[10px] text-amber-600 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20">
									Cloud Sync
								</span>
							</div>

							<div className="my-8 flex h-44 items-center justify-center">
								<svg
									viewBox="0 0 160 160"
									className="h-36 w-36 stroke-muted-foreground transition-transform duration-500 group-hover:scale-105 group-hover:stroke-foreground"
									fill="none"
									strokeWidth="1.2"
								>
									<title>Hybrid Mode Diagram</title>
									<path
										d="M45 65 L72 78 L45 91 L18 78 Z"
										className="fill-muted"
									/>
									<path d="M18 78 L18 108 L45 121 L72 108 L72 78" />
									<path d="M45 91 L45 121" />
									<text
										x="45"
										y="105"
										textAnchor="middle"
										fontSize="3.5"
										className="fill-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										local
									</text>
									<text
										x="45"
										y="110"
										textAnchor="middle"
										fontSize="3"
										className="fill-muted-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										&lt;1ms
									</text>
									<path
										d="M115 35 L142 48 L115 61 L88 48 Z"
										className="fill-muted"
									/>
									<path d="M88 48 L88 78 L115 91 L142 78 L142 48" />
									<path d="M115 61 L115 91" />
									<text
										x="115"
										y="76"
										textAnchor="middle"
										fontSize="3.5"
										className="fill-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										cloud
									</text>
									<text
										x="115"
										y="81"
										textAnchor="middle"
										fontSize="3"
										className="fill-muted-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										replica
									</text>
									<path d="M58 72 L102 54" strokeDasharray="3 3" />
									<text
										x="80"
										y="57"
										textAnchor="middle"
										fontSize="3"
										className="fill-muted-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										push
									</text>
									<path d="M58 84 L102 66" strokeDasharray="3 3" />
									<text
										x="80"
										y="82"
										textAnchor="middle"
										fontSize="3"
										className="fill-muted-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										pull
									</text>
									<circle cx="80" cy="69" r="6" strokeDasharray="2 2" />
									<text
										x="80"
										y="71"
										textAnchor="middle"
										fontSize="3.5"
										className="fill-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										sync
									</text>
									<path
										d="M45 127 L72 140 L45 153 L18 140 Z"
										strokeDasharray="3 3"
										strokeOpacity="0.25"
									/>
									<path
										d="M115 97 L142 110 L115 123 L88 110 Z"
										strokeDasharray="3 3"
										strokeOpacity="0.25"
									/>
								</svg>
							</div>

							<h3 className="text-lg font-semibold text-foreground">
								Hybrid Sync Mode
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								Sub-millisecond local execution with automatic cloud
								replication. Your agent memory follows you across multiple
								machines, desktop workstations, and teammates.
							</p>
						</div>
					</div>

					{/* Card 3: Hosted MCP Endpoint */}
					<div className="group relative flex flex-col justify-between p-8 transition-colors hover:bg-muted/60">
						<div>
							<div className="flex items-center justify-between">
								<span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
									RUNTIME 03
								</span>
								<span className="font-mono text-[10px] text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/20">
									Zero Local Files
								</span>
							</div>

							<div className="my-8 flex h-44 items-center justify-center">
								<svg
									viewBox="0 0 160 160"
									className="h-36 w-36 stroke-muted-foreground transition-transform duration-500 group-hover:scale-105 group-hover:stroke-foreground"
									fill="none"
									strokeWidth="1.2"
								>
									<title>Hosted MCP Diagram</title>
									<path
										d="M80 20 L108 34 L80 48 L52 34 Z"
										className="fill-muted"
									/>
									<path d="M52 34 L52 62 L80 76 L108 62 L108 34" />
									<path d="M80 48 L80 76" />
									<text
										x="80"
										y="46"
										textAnchor="middle"
										fontSize="3.2"
										className="fill-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										MCP
									</text>
									<text
										x="80"
										y="50"
										textAnchor="middle"
										fontSize="2.5"
										className="fill-muted-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										/mcp
									</text>
									<circle cx="80" cy="34" r="3" strokeDasharray="2 2" />
									<line x1="55" y1="65" x2="35" y2="92" strokeDasharray="3 3" />
									<text
										x="45"
										y="82"
										textAnchor="middle"
										fontSize="3"
										className="fill-muted-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
										rotate="-30"
									>
										sse
									</text>
									<line
										x1="80"
										y1="76"
										x2="80"
										y2="102"
										strokeDasharray="3 3"
									/>
									<line
										x1="105"
										y1="65"
										x2="125"
										y2="92"
										strokeDasharray="3 3"
									/>
									<path
										d="M35 92 L53 101 L35 110 L17 101 Z"
										className="fill-muted"
									/>
									<path d="M17 101 L17 119 L35 128 L53 119 L53 101" />
									<path d="M35 110 L35 128" />
									<text
										x="35"
										y="118"
										textAnchor="middle"
										fontSize="3"
										className="fill-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										CI
									</text>
									<path
										d="M80 102 L98 111 L80 120 L62 111 Z"
										className="fill-muted"
									/>
									<path d="M62 111 L62 129 L80 138 L98 129 L98 111" />
									<path d="M80 120 L80 138" />
									<text
										x="80"
										y="128"
										textAnchor="middle"
										fontSize="3"
										className="fill-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										agent
									</text>
									<path
										d="M125 92 L143 101 L125 110 L107 101 Z"
										className="fill-muted"
									/>
									<path d="M107 101 L107 119 L125 128 L143 119 L143 101" />
									<path d="M125 110 L125 128" />
									<text
										x="125"
										y="118"
										textAnchor="middle"
										fontSize="3"
										className="fill-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										serverless
									</text>
									<text
										x="80"
										y="12"
										textAnchor="middle"
										fontSize="3"
										className="fill-muted-foreground"
										style={{ fontFamily: "var(--font-mono)" }}
									>
										∅ local files
									</text>
								</svg>
							</div>

							<h3 className="text-lg font-semibold text-foreground">
								Hosted MCP Endpoint
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								MemoFS Cloud hosts the runtime directly. Remote agents,
								ephemeral CI/CD containers, and serverless bots connect via
								standard MCP endpoint URL and API key.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
