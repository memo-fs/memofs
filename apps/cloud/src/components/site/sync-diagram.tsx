/**
 * Sync architecture diagram (Signal aesthetic).
 *
 * An inline SVG that visualizes the file-replica model from ADR 0002 / the
 * locked positioning: the local `.tekmemo/` engine (recall, graph, extraction)
 * on the left, the cloud file replica (content-addressed R2 blobs + manifest) on
 * the right, connected by the three-command sync protocol. The cloud node is
 * drawn deliberately "dumb" — just storage glyphs, no engine — to reinforce the
 * core positioning at a glance.
 *
 * Pure-presentational, aria-hidden, scales to its container.
 */
export function SyncDiagram({ className }: { className?: string }) {
	const gid = "tekmemo-sync-grad";
	return (
		<svg
			viewBox="0 0 720 280"
			fill="none"
			className={className}
			role="img"
			aria-label="The local TekMemo engine syncs .tekmemo files to the cloud file replica via three commands."
		>
			<defs>
				<linearGradient
					id={gid}
					x1="0"
					y1="0"
					x2="720"
					y2="0"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="oklch(0.7 0.15 215)" />
					<stop offset="0.5" stopColor="oklch(0.62 0.17 248)" />
					<stop offset="1" stopColor="oklch(0.58 0.19 295)" />
				</linearGradient>
			</defs>

			{/* ── Local engine panel ─────────────────────────────────────────── */}
			<rect
				x="16"
				y="40"
				width="240"
				height="200"
				rx="14"
				stroke="oklch(1 0 0 / 0.10)"
				strokeWidth="1"
				fill="oklch(0.16 0.008 264 / 0.6)"
			/>
			<rect
				x="16"
				y="40"
				width="240"
				height="200"
				rx="14"
				stroke={`url(#${gid})`}
				strokeWidth="1"
				opacity="0.25"
			/>
			<text
				x="136"
				y="72"
				textAnchor="middle"
				fill="oklch(0.97 0.002 264)"
				fontFamily="monospace"
				fontSize="13"
				fontWeight="600"
			>
				Your machine
			</text>
			<text
				x="136"
				y="90"
				textAnchor="middle"
				fill="oklch(0.64 0.01 264)"
				fontFamily="monospace"
				fontSize="10"
			>
				local-first · $0
			</text>

			{/* engine sub-blocks */}
			<EngineBlock x={36} y={108} label="Recall" />
			<EngineBlock x={136} y={108} label="Graph" />
			<EngineBlock x={36} y={164} label="Extraction" />
			<EngineBlock x={136} y={164} label=".tekmemo/" highlight />

			{/* ── Cloud replica panel ────────────────────────────────────────── */}
			<rect
				x="464"
				y="40"
				width="240"
				height="200"
				rx="14"
				stroke="oklch(1 0 0 / 0.10)"
				strokeWidth="1"
				fill="oklch(0.16 0.008 264 / 0.6)"
			/>
			<rect
				x="464"
				y="40"
				width="240"
				height="200"
				rx="14"
				stroke={`url(#${gid})`}
				strokeWidth="1"
				opacity="0.25"
			/>
			<text
				x="584"
				y="72"
				textAnchor="middle"
				fill="oklch(0.97 0.002 264)"
				fontFamily="monospace"
				fontSize="13"
				fontWeight="600"
			>
				TekMemo Cloud
			</text>
			<text
				x="584"
				y="90"
				textAnchor="middle"
				fill="oklch(0.64 0.01 264)"
				fontFamily="monospace"
				fontSize="10"
			>
				file replica · dumb
			</text>

			{/* storage glyphs — blobs, keyed by sha256 */}
			<Blob x={492} y={116} />
			<Blob x={548} y={116} />
			<Blob x={604} y={116} />
			<Blob x={660} y={116} />
			<Blob x={520} y={166} />
			<Blob x={576} y={166} />
			<Blob x={632} y={166} />
			<text
				x="584"
				y="212"
				textAnchor="middle"
				fill="oklch(0.64 0.01 264)"
				fontFamily="monospace"
				fontSize="10"
			>
				R2 blobs · sha256 · path manifest
			</text>

			{/* ── Sync channel ───────────────────────────────────────────────── */}
			<line
				x1="266"
				y1="140"
				x2="454"
				y2="140"
				stroke={`url(#${gid})`}
				strokeWidth="2"
				strokeDasharray="4 4"
			/>
			{/* arrowhead */}
			<path d="M 454 140 L 446 135 L 446 145 Z" fill="oklch(0.62 0.17 248)" />
			<path
				d="M 266 140 L 274 135 L 274 145 Z"
				fill="oklch(0.62 0.17 248)"
				opacity="0.5"
			/>
			<text
				x="360"
				y="128"
				textAnchor="middle"
				fill="oklch(0.82 0.08 248)"
				fontFamily="monospace"
				fontSize="11"
				fontWeight="600"
			>
				push / pull
			</text>
			<text
				x="360"
				y="158"
				textAnchor="middle"
				fill="oklch(0.64 0.01 264)"
				fontFamily="monospace"
				fontSize="10"
			>
				byte-for-byte · no engine
			</text>
		</svg>
	);
}

function EngineBlock({
	x,
	y,
	label,
	highlight = false,
}: {
	x: number;
	y: number;
	label: string;
	highlight?: boolean;
}) {
	return (
		<g>
			<rect
				x={x}
				y={y}
				width="84"
				height="40"
				rx="8"
				stroke={
					highlight ? "oklch(0.62 0.17 248 / 0.5)" : "oklch(1 0 0 / 0.10)"
				}
				strokeWidth="1"
				fill={highlight ? "oklch(0.62 0.17 248 / 0.08)" : "oklch(1 0 0 / 0.02)"}
			/>
			<text
				x={x + 42}
				y={y + 24}
				textAnchor="middle"
				fill={highlight ? "oklch(0.82 0.08 248)" : "oklch(0.97 0.002 264)"}
				fontFamily="monospace"
				fontSize="11"
				fontWeight="500"
			>
				{label}
			</text>
		</g>
	);
}

function Blob({ x, y }: { x: number; y: number }) {
	return (
		<g>
			<rect
				x={x}
				y={y}
				width="36"
				height="28"
				rx="6"
				stroke="oklch(1 0 0 / 0.10)"
				strokeWidth="1"
				fill="oklch(1 0 0 / 0.02)"
			/>
			<rect
				x={x + 8}
				y={y + 8}
				width="20"
				height="3"
				rx="1.5"
				fill="oklch(0.62 0.17 248 / 0.5)"
			/>
			<rect
				x={x + 8}
				y={y + 15}
				width="14"
				height="3"
				rx="1.5"
				fill="oklch(1 0 0 / 0.12)"
			/>
		</g>
	);
}
