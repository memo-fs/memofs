export function RuntimesSection() {
	return (
		<section
			id="runtimes"
			className="relative w-full border-t border-dashed border-zinc-300/90 dark:border-zinc-800/80 bg-white dark:bg-black py-20 text-zinc-900 dark:text-white sm:py-28 transition-colors duration-300"
		>
			<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="mb-16 text-center">
					<p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
						Runtimes
					</p>
					<h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
						One engine, three storage modes
					</h2>
					<p className="mt-4 text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
						MemoFS is built on a unified store abstraction. Choose where your
						memory resides based on your workflow and access needs.
					</p>
				</div>

				{/* 3-Column Diagram Cards */}
				<div className="grid grid-cols-1 divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-dashed border-zinc-300 dark:border-zinc-800/80 md:grid-cols-3 md:divide-x md:divide-y-0">
					{/* Card 1: Local Storage Mode */}
					<div className="group relative flex flex-col justify-between p-8 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-950/60">
						<div>
							<div className="flex items-center justify-between">
								<span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
									RUNTIME 01
								</span>
								<span className="font-mono text-[10px] text-zinc-700 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-800 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900/60">
									Offline First
								</span>
							</div>

							{/* Local Mode Diagram: Isometric Local File System & Markdown Layers */}
							<div className="my-8 flex h-44 items-center justify-center">
								<svg
									viewBox="0 0 160 160"
									className="h-36 w-36 stroke-zinc-400 dark:stroke-zinc-500 transition-transform duration-500 group-hover:scale-105 group-hover:stroke-zinc-800 dark:group-hover:stroke-zinc-300"
									fill="none"
									strokeWidth="1.2"
								>
									<title>Local Mode Diagram</title>
									{/* Base repository folder plate */}
									<path
										d="M80 115 L135 90 L80 65 L25 90 Z"
										className="fill-zinc-100 dark:fill-[#09090b]"
									/>
									<path d="M25 90 L25 105 L80 130 L135 105 L135 90" />

									{/* Stacked markdown memory sheets */}
									<path
										d="M80 88 L125 68 L80 48 L35 68 Z"
										className="fill-white dark:fill-[#09090b]"
									/>
									<path d="M35 68 L35 74 L80 94 L125 74 L125 68" />

									<path
										d="M80 76 L125 56 L80 36 L35 56 Z"
										className="fill-white dark:fill-[#09090b]"
									/>
									<path d="M35 56 L35 62 L80 82 L125 62 L125 56" />

									{/* Top active note sheet with file lines */}
									<path
										d="M80 64 L125 44 L80 24 L35 44 Z"
										className="fill-white dark:fill-[#09090b]"
									/>
									<line x1="60" y1="41" x2="95" y2="41" strokeOpacity="0.6" />
									<line x1="55" y1="46" x2="105" y2="46" strokeOpacity="0.6" />
									<line x1="60" y1="51" x2="90" y2="51" strokeOpacity="0.6" />

									{/* Directory bounding guide ticks */}
									<circle cx="80" cy="24" r="2" fill="currentColor" />
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

							<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
								Local Storage Mode
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
								All memory is stored directly on your project&apos;s filesystem
								as versioned markdown and JSON. Zero network latency, fully
								offline, and 100% git-trackable.
							</p>
						</div>
					</div>

					{/* Card 2: Hybrid Sync Mode */}
					<div className="group relative flex flex-col justify-between p-8 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-950/60">
						<div>
							<div className="flex items-center justify-between">
								<span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
									RUNTIME 02
								</span>
								<span className="font-mono text-[10px] text-amber-600 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20">
									Cloud Sync
								</span>
							</div>

							{/* Hybrid Mode Diagram: Dual Node Sync (Local Node + Cloud Replica) */}
							<div className="my-8 flex h-44 items-center justify-center">
								<svg
									viewBox="0 0 160 160"
									className="h-36 w-36 stroke-zinc-400 dark:stroke-zinc-500 transition-transform duration-500 group-hover:scale-105 group-hover:stroke-zinc-800 dark:group-hover:stroke-zinc-300"
									fill="none"
									strokeWidth="1.2"
								>
									<title>Hybrid Mode Diagram</title>
									{/* Left node: Local Machine */}
									<path
										d="M45 65 L72 78 L45 91 L18 78 Z"
										className="fill-zinc-100 dark:fill-[#09090b]"
									/>
									<path d="M18 78 L18 108 L45 121 L72 108 L72 78" />
									<path d="M45 91 L45 121" />
									<circle cx="45" cy="78" r="2" fill="currentColor" />

									{/* Right elevated node: MemoFS Cloud */}
									<path
										d="M115 35 L142 48 L115 61 L88 48 Z"
										className="fill-amber-50/50 dark:fill-[#09090b]"
									/>
									<path d="M88 48 L88 78 L115 91 L142 78 L142 48" />
									<path d="M115 61 L115 91" />
									<circle cx="115" cy="48" r="2" fill="currentColor" />

									{/* Bidirectional sync streams */}
									<path d="M58 72 L102 54" strokeDasharray="3 3" />
									<path d="M58 84 L102 66" strokeDasharray="3 3" />

									{/* Central Sync Pulse Indicator */}
									<circle cx="80" cy="69" r="6" strokeDasharray="2 2" />
									<line x1="77" y1="69" x2="83" y2="69" />
									<line x1="80" y1="66" x2="80" y2="72" />

									{/* Ground shadow projection */}
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

							<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
								Hybrid Sync Mode
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
								Sub-millisecond local execution with automatic cloud
								replication. Your agent memory follows you across multiple
								machines, desktop workstations, and teammates.
							</p>
						</div>
					</div>

					{/* Card 3: Hosted MCP Endpoint */}
					<div className="group relative flex flex-col justify-between p-8 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-950/60">
						<div>
							<div className="flex items-center justify-between">
								<span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
									RUNTIME 03
								</span>
								<span className="font-mono text-[10px] text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/20">
									Zero Local Files
								</span>
							</div>

							{/* Hosted MCP Diagram: Central Protocol Hub Distributing to Agent Clients */}
							<div className="my-8 flex h-44 items-center justify-center">
								<svg
									viewBox="0 0 160 160"
									className="h-36 w-36 stroke-zinc-400 dark:stroke-zinc-500 transition-transform duration-500 group-hover:scale-105 group-hover:stroke-zinc-800 dark:group-hover:stroke-zinc-300"
									fill="none"
									strokeWidth="1.2"
								>
									<title>Hosted MCP Diagram</title>
									{/* Central MCP Hub Hexagon / Cube */}
									<path
										d="M80 20 L108 34 L80 48 L52 34 Z"
										className="fill-cyan-50/50 dark:fill-[#09090b]"
									/>
									<path d="M52 34 L52 62 L80 76 L108 62 L108 34" />
									<path d="M80 48 L80 76" />
									<circle cx="80" cy="34" r="3" strokeDasharray="2 2" />

									{/* Connecting transmission channels */}
									<line x1="55" y1="65" x2="35" y2="92" strokeDasharray="3 3" />
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

									{/* Branching Agent Client Nodes */}
									{/* Left Client */}
									<path
										d="M35 92 L53 101 L35 110 L17 101 Z"
										className="fill-zinc-100 dark:fill-[#09090b]"
									/>
									<path d="M17 101 L17 119 L35 128 L53 119 L53 101" />
									<path d="M35 110 L35 128" />

									{/* Middle Client */}
									<path
										d="M80 102 L98 111 L80 120 L62 111 Z"
										className="fill-zinc-100 dark:fill-[#09090b]"
									/>
									<path d="M62 111 L62 129 L80 138 L98 129 L98 111" />
									<path d="M80 120 L80 138" />

									{/* Right Client */}
									<path
										d="M125 92 L143 101 L125 110 L107 101 Z"
										className="fill-zinc-100 dark:fill-[#09090b]"
									/>
									<path d="M107 101 L107 119 L125 128 L143 119 L143 101" />
									<path d="M125 110 L125 128" />
								</svg>
							</div>

							<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
								Hosted MCP Endpoint
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
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
